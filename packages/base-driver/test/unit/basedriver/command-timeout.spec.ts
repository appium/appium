import assert from 'node:assert/strict';
import {it} from 'node:test';

import sinon from 'sinon';

import {hasRunningCommands} from '../../../lib/basedriver/command-timeout.js';
import {BaseDriver, runWithCommandTimeout} from '../../../lib/index.js';

it('should guard a custom timer implementation on a current driver', async function () {
  const driver = new BaseDriver();
  driver.sessionId = 'session';
  const customTimer = sinon.stub(driver, 'startNewCommandTimeout').resolves();
  try {
    await runWithCommandTimeout(driver, async () => {
      await driver.startNewCommandTimeout();
      assert.equal(customTimer.callCount, 0);
    });
    assert.equal(customTimer.callCount, 1);
    assert.equal(driver.startNewCommandTimeout, customTimer);
  } finally {
    customTimer.restore();
    await driver.clearNewCommandTimeout();
  }
});

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

it('should share idle timeout protection with another loaded copy of base-driver', async function () {
  const otherCopy = await import(
    new URL('../../../lib/basedriver/command-timeout.js?other-copy', import.meta.url).href
  );
  const driver = new BaseDriver();
  driver.sessionId = 'session';
  driver.newCommandTimeoutMs = 1000;
  const originalMethod = driver.startNewCommandTimeout;
  const originalDescriptor = Object.getOwnPropertyDescriptor(driver, 'startNewCommandTimeout');
  const clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const command = otherCopy.runWithCommandTimeout(driver, () => pending);
  try {
    assert.equal(driver.startNewCommandTimeout, originalMethod);
    assert.deepEqual(Object.getOwnPropertyDescriptor(driver, 'startNewCommandTimeout'), originalDescriptor);
    await driver.executeCommand('getStatus');
    await clock.tickAsync(2000);
    assert.equal(driver.sessionId, 'session');
    finish();
    await command;
    await clock.tickAsync(1000);
    assert.equal(driver.sessionId, null);
  } finally {
    finish();
    await command;
    await driver.clearNewCommandTimeout();
    clock.restore();
  }
});

for (const ownMethod of [false, true]) {
  for (const fails of [false, true]) {
    it(`should protect legacy driver post-processing (${ownMethod ? 'own' : 'inherited'} timer method, ${fails ? 'failure' : 'success'})`, async function () {
      const otherCopy = await import(
        new URL('../../../lib/basedriver/command-timeout.js?legacy-copy', import.meta.url).href
      );
      const driver = new LegacyTimeoutDriver();
      const otherDriver = new LegacyTimeoutDriver();
      const otherDriverMethod = otherDriver.startNewCommandTimeout;
      if (ownMethod) {
        driver.startNewCommandTimeout = driver.startNewCommandTimeout.bind(driver);
      }
      const originalMethod = driver.startNewCommandTimeout;
      const originalDescriptor = Object.getOwnPropertyDescriptor(driver, 'startNewCommandTimeout');
      const clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
      let finish!: () => void;
      const pending = new Promise<void>((resolve) => {
        finish = resolve;
      });
      let markStarted!: () => void;
      const started = new Promise<void>((resolve) => {
        markStarted = resolve;
      });
      const command = runWithCommandTimeout(driver, async () => {
        await driver.executeCommand(async () => {});
        markStarted();
        await pending;
        if (fails) {
          throw new Error('post-processing failed');
        }
      }).then(
        () => null,
        (error: Error) => error,
      );
      try {
        await started;
        assert.equal(otherDriver.startNewCommandTimeout, otherDriverMethod);
        await clock.tickAsync(2000);
        assert.equal(driver.sessionId, 'session');
        // An overlapping command must not release the outer plugin's protection.
        await otherCopy.runWithCommandTimeout(driver, () => driver.executeCommand(async () => {}));
        await clock.tickAsync(2000);
        assert.equal(driver.sessionId, 'session');
        finish();
        const result = await command;
        assert.equal(result?.message ?? null, fails ? 'post-processing failed' : null);
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

// Model the previous base-driver's private counter without inheriting any new timeout guards.
class LegacyTimeoutDriver {
  sessionId: string | null = 'session';
  isCommandsQueueEnabled = true;
  private inFlightCommandCount = 0;
  private timer?: ReturnType<typeof setTimeout>;

  /** Execute a command using only the legacy driver's own activity count. */
  async executeCommand(command: () => Promise<void>): Promise<void> {
    this.inFlightCommandCount++;
    try {
      await this.clearNewCommandTimeout();
      await command();
    } finally {
      this.inFlightCommandCount--;
      if (!this.inFlightCommandCount) {
        await this.startNewCommandTimeout();
      }
    }
  }

  /** Clear the legacy driver's idle timer. */
  async clearNewCommandTimeout(): Promise<void> {
    clearTimeout(this.timer);
  }

  /** Arm idle expiry without knowing about the server's shared activity counter. */
  async startNewCommandTimeout(): Promise<void> {
    await this.clearNewCommandTimeout();
    if (!this.inFlightCommandCount) {
      this.timer = setTimeout(() => {
        this.sessionId = null;
      }, 1000);
    }
  }
}
