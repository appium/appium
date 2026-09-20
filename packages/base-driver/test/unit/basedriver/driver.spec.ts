import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

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
  describe('constructor', function () {
    it('should initialize "opts"', function () {
      const driver = new BaseDriver({} as InitialOpts);
      assert.ok(driver.opts);
    });
  });

  describe('executeCommand', function () {
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
  });
});
