import assert from 'node:assert/strict';
import {it} from 'node:test';

import sinon from 'sinon';

import {hasRunningCommands} from '../../../lib/basedriver/command-timeout.js';
import {BaseDriver, runWithCommandTimeout} from '../../../lib/index.js';

for (const sessionId of ['', null]) {
  it(`should not restart idle expiry for session ID ${JSON.stringify(sessionId)}`, async function () {
    const driver = new BaseDriver();
    driver.sessionId = sessionId;
    const startTimeout = sinon.spy(driver, 'startNewCommandTimeout');
    try {
      await runWithCommandTimeout(driver, async () => {});
      assert.equal(startTimeout.callCount, 0);
      assert.equal(hasRunningCommands(driver), false);
    } finally {
      startTimeout.restore();
      await driver.clearNewCommandTimeout();
    }
  });
}

for (const failure of ['clear', 'command']) {
  it(`should release command activity after ${failure} fails and allow subsequent work`, async function () {
    const error = new Error('failed');
    const clearTimeout = sinon.stub().resolves();
    const startTimeout = sinon.stub().resolves();
    const driver = {
      sessionId: 'session',
      isCommandsQueueEnabled: true,
      clearNewCommandTimeout: clearTimeout,
      startNewCommandTimeout: startTimeout,
    };
    if (failure === 'clear') {
      clearTimeout.rejects(error);
    }
    const command = sinon.stub().throws(error);
    await assert.rejects(runWithCommandTimeout(driver, command), error);
    assert.equal(command.callCount, failure === 'clear' ? 0 : 1);
    assert.equal(hasRunningCommands(driver), false);
    assert.equal(startTimeout.callCount, 1);
    assert.equal(driver.startNewCommandTimeout, startTimeout);

    clearTimeout.resolves();
    await runWithCommandTimeout(driver, async () => {
      assert.equal(hasRunningCommands(driver), true);
    });
    assert.equal(hasRunningCommands(driver), false);
    assert.equal(startTimeout.callCount, 2);
  });
}

for (const ownMethod of [false, true]) {
  for (const fails of [false, true]) {
    it(`should share activity across ESM copies without replacing the ${ownMethod ? 'read-only own' : 'inherited'} timer (${fails ? 'failure' : 'success'})`, async function () {
      const otherCopy = await import(
        new URL('../../../lib/basedriver/command-timeout.js?other-copy', import.meta.url).href
      );
      const driver = new BaseDriver();
      driver.sessionId = 'session';
      driver.newCommandTimeoutMs = 1000;
      if (ownMethod) {
        Object.defineProperty(driver, 'startNewCommandTimeout', {
          value: driver.startNewCommandTimeout,
          configurable: false,
          writable: false,
        });
      }
      const originalMethod = driver.startNewCommandTimeout;
      const originalDescriptor = Object.getOwnPropertyDescriptor(driver, 'startNewCommandTimeout');
      const clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
      const error = new Error('command failed');
      let finish!: () => void;
      const pending = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const command = otherCopy
        .runWithCommandTimeout(driver, async () => {
          await pending;
          if (fails) {
            throw error;
          }
        })
        .then(
          () => null,
          (err: unknown) => err,
        );
      try {
        assert.equal(driver.startNewCommandTimeout, originalMethod);
        assert.deepEqual(Object.getOwnPropertyDescriptor(driver, 'startNewCommandTimeout'), originalDescriptor);
        // An overlapping command in this module copy must not rearm the idle timer.
        await driver.executeCommand('getStatus');
        await driver.startNewCommandTimeout();
        await clock.tickAsync(2000);
        assert.equal(driver.sessionId, 'session');
        assert.equal(hasRunningCommands(driver), true);
        finish();
        assert.equal(await command, fails ? error : null);
        assert.equal(hasRunningCommands(driver), false);
        assert.equal(driver.startNewCommandTimeout, originalMethod);
        assert.deepEqual(Object.getOwnPropertyDescriptor(driver, 'startNewCommandTimeout'), originalDescriptor);
        await clock.tickAsync(999);
        assert.equal(driver.sessionId, 'session');
        await clock.tickAsync(1);
        assert.equal(driver.sessionId, null);
      } finally {
        finish();
        await command;
        await driver.clearNewCommandTimeout();
        clock.restore();
      }
    });
  }
}
