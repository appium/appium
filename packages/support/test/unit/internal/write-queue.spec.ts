import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {setTimeout as sleep} from 'node:timers/promises';

import {WriteQueue} from '../../../lib/internal/write-queue.js';

describe('WriteQueue', function () {
  function tracker() {
    let running = 0;
    let peak = 0;
    return {
      get peak() {
        return peak;
      },
      job:
        (ms = 5) =>
        async () => {
          running++;
          peak = Math.max(peak, running);
          await sleep(ms);
          running--;
        },
    };
  }

  it('should run the jobs concurrently up to the limit', async function () {
    const t = tracker();
    const queue = new WriteQueue(3, 1_000_000);
    for (let i = 0; i < 12; i++) {
      await queue.submit(`k${i}`, 1, t.job());
    }
    await queue.drain();
    assert.strictEqual(t.peak, 3);
  });

  it('should limit the memory held by running jobs', async function () {
    const t = tracker();
    const queue = new WriteQueue(10, 100);
    for (let i = 0; i < 10; i++) {
      await queue.submit(`k${i}`, 60, t.job());
    }
    await queue.drain();
    assert.strictEqual(t.peak, 1);
  });

  it('should accept a job bigger than the memory limit if nothing else runs', async function () {
    const t = tracker();
    const queue = new WriteQueue(4, 10);
    await queue.submit('big', 1000, t.job());
    await queue.drain();
    assert.strictEqual(t.peak, 1);
  });

  it('should not overlap jobs with the same key', async function () {
    const t = tracker();
    const queue = new WriteQueue(8, 1_000_000);
    for (let i = 0; i < 6; i++) {
      await queue.submit('same', 1, t.job());
    }
    await queue.drain();
    assert.strictEqual(t.peak, 1);
  });

  it('should report the first failure and still wait for running jobs', async function () {
    const queue = new WriteQueue(4, 1_000_000);
    let finished = false;
    await queue.submit('slow', 1, async () => {
      await sleep(30);
      finished = true;
    });
    await queue.submit('bad', 1, async () => {
      throw new Error('first');
    });
    await assert.rejects(
      queue.submit('late', 1, async () => {}),
      /first/,
    );
    await assert.rejects(queue.drain(), /first/);
    assert.strictEqual(finished, true);
  });

  it('should settle without throwing', async function () {
    const queue = new WriteQueue(2, 100);
    await queue.submit('bad', 1, async () => {
      throw new Error('boom');
    });
    await queue.settle();
  });
});
