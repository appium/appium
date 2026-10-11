import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {describe, it} from 'node:test';
import {promisify} from 'node:util';

import type {InitialOpts} from '@appium/types';

import {BaseDriver} from '../../../lib/index.js';

class SlowCommandDriver extends BaseDriver<any> {
  async slowCommand(): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return 'slow-done';
  }

  async quickCommand(): Promise<string> {
    return 'quick-done';
  }
}

class CustomExemptDriver extends SlowCommandDriver {
  override get queueExemptCommands(): ReadonlySet<string> {
    return new Set([...super.queueExemptCommands, 'quickCommand']);
  }
}

describe('BaseDriver', function () {
  describe('idle timeout cleanup', function () {
    for (const rejection of ["new Error('simulated cleanup failure')", "'simulated cleanup failure'"]) {
      it(`should keep the process alive when cleanup rejects with ${rejection}`, async function () {
        // A separate process proves that no unhandled rejection can terminate other sessions.
        // Everything runs in memory; no devices or network connections are used.
        const moduleUrl = new URL('../../../lib/index.js', import.meta.url).href;
        const {stdout, stderr} = await promisify(execFile)(
          process.execPath,
          [
            '--input-type=module',
            '--eval',
            `
              import assert from 'node:assert/strict';
              import {BaseDriver} from ${JSON.stringify(moduleUrl)};
              const expired = new BaseDriver();
              const healthy = new BaseDriver();
              expired.sessionId = 'expired-session';
              healthy.sessionId = 'healthy-session';
              expired.newCommandTimeoutMs = 10;
              healthy.newCommandTimeoutMs = 0;
              let shutdowns = 0;
              let cleanups = 0;
              expired.onUnexpectedShutdown(() => shutdowns++);
              expired.deleteSession = async () => { cleanups++; throw ${rejection}; };
              await expired.startNewCommandTimeout();
              await new Promise((resolve) => setTimeout(resolve, 100));
              assert.equal(shutdowns, 1);
              assert.equal(cleanups, 1);
              assert.equal(expired.shutdownUnexpectedly, false);
              assert.equal(healthy.sessionId, 'healthy-session');
              await healthy.executeCommand('getStatus');
              console.log('other session remains usable');
              await expired.clearNewCommandTimeout();
              await healthy.clearNewCommandTimeout();
            `,
          ],
          {timeout: 5000},
        );
        assert.match(stdout, /other session remains usable/);
        assert.match(stderr, /simulated cleanup failure/);
      });
    }

    it('should still propagate cleanup failures to callers awaiting shutdown', async function () {
      const driver = new BaseDriver();
      driver.sessionId = 'session';
      const error = new Error('cleanup failed');
      driver.deleteSession = async () => {
        throw error;
      };
      await assert.rejects(driver.startUnexpectedShutdown(), (actual) => actual === error);
      assert.equal(driver.shutdownUnexpectedly, false);
    });
  });

  describe('constructor', function () {
    it('should initialize "opts"', function () {
      const driver = new BaseDriver({} as InitialOpts);
      assert.ok(driver.opts);
    });
  });

  describe('executeCommand', function () {
    it('should only time out after the last queued command finishes', async function () {
      const driver = new SlowCommandDriver({} as InitialOpts);
      driver.sessionId = 'queued-timeout-test';
      driver.newCommandTimeoutMs = 50;
      try {
        assert.deepEqual(
          await Promise.all([driver.executeCommand('slowCommand'), driver.executeCommand('slowCommand')]),
          ['slow-done', 'slow-done'],
        );
        assert.equal(driver.sessionId, 'queued-timeout-test');
        const shutdown = new Promise<void>((resolve) => driver.eventEmitter.once('onUnexpectedShutdown', resolve));
        await shutdown;
        // The shutdown event is emitted before deleteSession completes.
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(driver.sessionId, null);
      } finally {
        await driver.clearNewCommandTimeout();
      }
    });

    it('should not make getStatus wait behind a command already in the queue', async function () {
      const driver = new SlowCommandDriver({} as InitialOpts);
      const order: string[] = [];

      const slowPromise = driver.executeCommand('slowCommand').then((res) => {
        order.push('slowCommand');
        return res;
      });
      // let the slow command actually start and occupy the queue before requesting status
      await new Promise((resolve) => setImmediate(resolve));

      const status = await driver.executeCommand('getStatus');
      order.push('getStatus');
      assert.deepEqual(status, {});

      assert.equal(await slowPromise, 'slow-done');
      assert.deepEqual(order, ['getStatus', 'slowCommand']);
      await driver.clearNewCommandTimeout();
    });

    it('should make a regular command wait behind a command already in the queue', async function () {
      const driver = new SlowCommandDriver({} as InitialOpts);
      const order: string[] = [];

      const slowPromise = driver.executeCommand('slowCommand').then((res) => {
        order.push('slowCommand');
        return res;
      });
      await new Promise((resolve) => setImmediate(resolve));

      const quickResult = await driver.executeCommand('quickCommand').then((res) => {
        order.push('quickCommand');
        return res;
      });

      assert.equal(quickResult, 'quick-done');
      assert.deepEqual(order, ['slowCommand', 'quickCommand']);
      assert.equal(await slowPromise, 'slow-done');
      await driver.clearNewCommandTimeout();
    });

    it('should allow a subclass to add its own queue-exempt commands', async function () {
      const driver = new CustomExemptDriver({} as InitialOpts);
      const order: string[] = [];

      const slowPromise = driver.executeCommand('slowCommand').then((res) => {
        order.push('slowCommand');
        return res;
      });
      await new Promise((resolve) => setImmediate(resolve));

      const quickResult = await driver.executeCommand('quickCommand').then((res) => {
        order.push('quickCommand');
        return res;
      });
      assert.equal(quickResult, 'quick-done');

      assert.equal(await slowPromise, 'slow-done');
      assert.deepEqual(order, ['quickCommand', 'slowCommand']);
      await driver.clearNewCommandTimeout();
    });

    it('should not restart the new command timeout while another command is still in flight', async function () {
      const driver = new SlowCommandDriver({} as InitialOpts);
      // short enough that a wrongly-restarted timer fires well before slowCommand finishes
      driver.newCommandTimeoutMs = 50;

      const slowPromise = driver.executeCommand('slowCommand');
      // let slowCommand start and settle in, then run an exempt command while it's still pending
      await new Promise((resolve) => setTimeout(resolve, 20));
      await driver.executeCommand('getStatus');

      // if getStatus wrongly restarted the timer, slowCommand would be rejected by an
      // unexpected shutdown well before its own 100ms completes
      assert.equal(await slowPromise, 'slow-done');
      await driver.clearNewCommandTimeout();
    });

    it('should not arm the idle timer when an unknown command arrives during another command', async function () {
      const driver = new SlowCommandDriver({} as InitialOpts);
      driver.newCommandTimeoutMs = 50;

      const slowPromise = driver.executeCommand('slowCommand');
      await new Promise((resolve) => setTimeout(resolve, 20));
      await assert.rejects(driver.executeCommand('notARealCommand'), /not yet been implemented/);

      assert.equal(await slowPromise, 'slow-done');
      await driver.clearNewCommandTimeout();
    });

    it('should arm the idle timer after an unknown command when the driver is idle', async function () {
      const driver = new BaseDriver({} as InitialOpts);
      driver.newCommandTimeoutMs = 30;
      let expired = false;
      driver.onUnexpectedShutdown(() => {
        expired = true;
      });

      await assert.rejects(driver.executeCommand('notARealCommand'), /not yet been implemented/);
      await new Promise((resolve) => setTimeout(resolve, 200));

      assert.equal(expired, true);
      await driver.clearNewCommandTimeout();
    });
  });
});
