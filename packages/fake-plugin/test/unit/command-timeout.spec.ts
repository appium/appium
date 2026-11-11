import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {BaseDriver} from 'appium/driver.js';
import sinon from 'sinon';

import {FakePlugin} from '../../lib/plugin.js';

describe('plugin work outside the command chain', function () {
  for (const fails of [false, true]) {
    it(`should protect the refresh and resume idle expiry after ${fails ? 'failure' : 'success'}`, async function () {
      const plugin = new QuietFakePlugin('fake');
      const driver = Object.assign(new BaseDriver(), {fakeSessionData: 'old'});
      driver.sessionId = 'session';
      driver.newCommandTimeoutMs = 1000;
      const clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
      const error = new Error('data retrieval failed');
      let finish!: () => void;
      const pending = new Promise<void>((resolve) => {
        finish = resolve;
      });
      let markStarted!: () => void;
      const started = new Promise<void>((resolve) => {
        markStarted = resolve;
      });
      await driver.startNewCommandTimeout();
      const refresh = plugin
        .refreshSessionData(driver, async () => {
          markStarted();
          await pending;
          if (fails) {
            throw error;
          }
          return 'updated';
        })
        .then(
          () => null,
          (err: unknown) => err,
        );
      try {
        await started;
        await driver.executeCommand('getStatus');
        await clock.tickAsync(2000);
        assert.equal(driver.sessionId, 'session');
        assert.equal(driver.fakeSessionData, 'old');
        finish();
        assert.equal(await refresh, fails ? error : null);
        assert.equal(driver.fakeSessionData, fails ? 'old' : 'updated');
        await clock.tickAsync(999);
        assert.equal(driver.sessionId, 'session');
        await clock.tickAsync(1);
        assert.equal(driver.sessionId, null);
      } finally {
        finish();
        await refresh;
        await driver.deleteSession();
        clock.restore();
      }
    });
  }
});

class QuietFakePlugin extends FakePlugin {
  /** Disable unrelated periodic clock events in the timeout example tests. */
  override async startClock(): Promise<void> {}
}
