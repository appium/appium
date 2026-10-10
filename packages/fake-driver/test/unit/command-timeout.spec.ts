import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import sinon from 'sinon';

import {FakeDriver} from '../../lib/driver.js';

describe('custom driver command timeout example', function () {
  for (const fails of [false, true]) {
    it(`should protect post-processing and resume idle expiry after ${fails ? 'failure' : 'success'}`, async function () {
      const driver = new FakeDriver();
      driver.sessionId = 'session';
      driver.newCommandTimeoutMs = 1000;
      const clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
      const error = new Error('post-processing failed');
      let finish!: () => void;
      const pending = new Promise<void>((resolve) => {
        finish = resolve;
      });
      let markStarted!: (handle: string) => void;
      const started = new Promise<string>((resolve) => {
        markStarted = resolve;
      });
      await driver.startNewCommandTimeout();
      const command = driver
        .getWindowHandleWithPostProcessing(async (handle) => {
          markStarted(handle);
          await pending;
          if (fails) {
            throw error;
          }
        })
        .then(
          (handle) => handle,
          (err: unknown) => err,
        );
      try {
        assert.equal(await started, '1');
        // Completing another command must not expire the still-running post-processing.
        await driver.executeCommand('getStatus');
        await clock.tickAsync(2000);
        assert.equal(driver.sessionId, 'session');
        finish();
        assert.equal(await command, fails ? error : '1');
        await clock.tickAsync(999);
        assert.equal(driver.sessionId, 'session');
        await clock.tickAsync(1);
        assert.equal(driver.sessionId, null);
      } finally {
        finish();
        await command;
        await driver.deleteSession();
        clock.restore();
      }
    });
  }
});
