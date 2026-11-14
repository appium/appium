import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {Constraints} from '@appium/types';

import {BaseDriver} from '../../../lib/index.js';

class QueuedDriver extends BaseDriver<Constraints> {
  release!: () => void;
  readonly blocked = new Promise<void>((resolve) => {
    this.release = resolve;
  });
  calls = 0;

  async blockedCommand() {
    await this.blocked;
  }

  async countedCommand() {
    return ++this.calls;
  }
}

describe('queued command cancellation', function () {
  it('should reject commands behind deleteSession without executing them', async function () {
    const driver = new QueuedDriver();
    driver.newCommandTimeoutMs = 0;
    driver.sessionId = 'test';
    const results = Promise.allSettled([
      driver.executeCommand('blockedCommand'),
      driver.executeCommand('deleteSession'),
      driver.executeCommand('countedCommand'),
      driver.executeCommand('countedCommand'),
    ]);
    await new Promise((resolve) => setImmediate(resolve));
    driver.release();
    const [first, deletion, ...cancelled] = await results;
    assert.equal(first.status, 'fulfilled');
    assert.equal(deletion.status, 'fulfilled');
    for (const result of cancelled) {
      assert.equal(result.status, 'rejected');
      if (result.status === 'rejected') {
        assert.equal(result.reason.error, 'invalid session id');
      }
    }
    assert.equal(driver.calls, 0);
    // Cancelled queue entries must drain without damaging the lock for subsequent work.
    assert.equal(await driver.executeCommand('countedCommand'), 1);
  });

  it('should reject waiting commands immediately when deletion occurs outside the queue', async function () {
    const driver = new QueuedDriver();
    driver.newCommandTimeoutMs = 0;
    driver.sessionId = 'test';
    const running = driver.executeCommand('blockedCommand');
    const cancelled = assert.rejects(driver.executeCommand('countedCommand'), /session was deleted/);
    await new Promise((resolve) => setImmediate(resolve));
    await driver.deleteSession();
    await cancelled;
    driver.release();
    await running;
    assert.equal(await driver.executeCommand('countedCommand'), 1);
  });
});
