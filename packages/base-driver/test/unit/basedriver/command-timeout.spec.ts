import assert from 'node:assert/strict';
import {it} from 'node:test';

import sinon from 'sinon';

import {BaseDriver} from '../../../lib/index.js';

it('should share idle timeout protection with another loaded copy of base-driver', async function () {
  const otherCopy = await import(
    new URL('../../../lib/basedriver/command-timeout.js?other-copy', import.meta.url).href
  );
  const driver = new BaseDriver();
  driver.sessionId = 'session';
  driver.newCommandTimeoutMs = 1000;
  const clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const command = otherCopy.runWithCommandTimeout(driver, () => pending);
  try {
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
