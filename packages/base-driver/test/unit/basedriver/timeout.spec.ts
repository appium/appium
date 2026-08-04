import assert from 'node:assert/strict';
import {after, afterEach, before, beforeEach, describe, it} from 'node:test';

import type {InitialOpts} from '@appium/types';
import {createSandbox} from 'sinon';

import {BaseDriver} from '../../../lib';

describe('timeout', function () {
  let driver: BaseDriver<any, any, any, any, any, any>;
  let implicitWaitSpy: sinon.SinonSpy;
  let sandbox: sinon.SinonSandbox;

  before(function () {
    driver = new BaseDriver({} as InitialOpts);
  });

  beforeEach(function () {
    sandbox = createSandbox();
    driver.implicitWaitMs = 0;
    implicitWaitSpy = sandbox.spy(driver, 'setImplicitWait');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('timeouts', function () {
    describe('errors', function () {
      it('should throw an error if something random is sent', async function () {
        await assert.rejects(driver.timeouts('random timeout', 'howdy'));
      });
      it('should throw an error if timeout is negative', async function () {
        await assert.rejects(driver.timeouts('random timeout', -42));
      });
      it('should throw an errors if timeout type is unknown', async function () {
        await assert.rejects(driver.timeouts('random timeout', 42));
      });
      it('should throw an error if something random is sent to scriptDuration', async function () {
        await assert.rejects(driver.timeouts(undefined, undefined, 123, undefined, undefined));
      });
      it('should throw an error if something random is sent to pageLoadDuration', async function () {
        await assert.rejects(driver.timeouts(undefined, undefined, undefined, 123, undefined));
      });
    });
    describe('implicit wait', function () {
      it('should call setImplicitWait when given an integer', async function () {
        await driver.timeouts('implicit', 42);
        assert.strictEqual(implicitWaitSpy.calledOnce, true);
        assert.strictEqual(implicitWaitSpy.firstCall.args[0], 42);
        assert.strictEqual(driver.implicitWaitMs, 42);
      });
      it('should call setImplicitWait when given a string', async function () {
        await driver.timeouts('implicit', '42');
        assert.strictEqual(implicitWaitSpy.calledOnce, true);
        assert.strictEqual(implicitWaitSpy.firstCall.args[0], 42);
        assert.strictEqual(driver.implicitWaitMs, 42);
      });
      it('should call setImplicitWait when given an integer to implicitDuration', async function () {
        await driver.timeouts(undefined, undefined, undefined, undefined, 42);
        assert.strictEqual(implicitWaitSpy.calledOnce, true);
        assert.strictEqual(implicitWaitSpy.firstCall.args[0], 42);
        assert.strictEqual(driver.implicitWaitMs, 42);
      });
      it('should call setImplicitWait when given a string to implicitDuration', async function () {
        await driver.timeouts(undefined, undefined, undefined, undefined, '42');
        assert.strictEqual(implicitWaitSpy.calledOnce, true);
        assert.strictEqual(implicitWaitSpy.firstCall.args[0], 42);
        assert.strictEqual(driver.implicitWaitMs, 42);
      });
    });
  });

  describe('set implicit wait', function () {
    it('should set the implicit wait with an integer', function () {
      driver.setImplicitWait(42);
      assert.strictEqual(driver.implicitWaitMs, 42);
    });
    describe('with managed driver', function () {
      let managedDriver1: BaseDriver<any, any, any, any, any, any>;
      let managedDriver2: BaseDriver<any, any, any, any, any, any>;
      before(function () {
        managedDriver1 = new BaseDriver({} as InitialOpts);
        managedDriver2 = new BaseDriver({} as InitialOpts);
        driver.addManagedDriver(managedDriver1);
        driver.addManagedDriver(managedDriver2);
      });
      after(function () {
        driver.managedDrivers = [];
      });
      it('should set the implicit wait on managed drivers', function () {
        driver.setImplicitWait(42);
        assert.strictEqual(driver.implicitWaitMs, 42);
        assert.strictEqual(managedDriver1.implicitWaitMs, 42);
        assert.strictEqual(managedDriver2.implicitWaitMs, 42);
      });
    });
  });

  describe('set new command timeout', function () {
    it('should set the new command timeout with an integer', function () {
      driver.setNewCommandTimeout(42);
      assert.strictEqual(driver.newCommandTimeoutMs, 42);
    });
    describe('with managed driver', function () {
      let managedDriver1: BaseDriver<any, any, any, any, any, any>;
      let managedDriver2: BaseDriver<any, any, any, any, any, any>;
      before(function () {
        managedDriver1 = new BaseDriver({} as InitialOpts);
        managedDriver2 = new BaseDriver({} as InitialOpts);
        driver.addManagedDriver(managedDriver1);
        driver.addManagedDriver(managedDriver2);
      });
      after(function () {
        driver.managedDrivers = [];
      });
      it('should set the new command timeout on managed drivers', function () {
        driver.setNewCommandTimeout(42);
        assert.strictEqual(driver.newCommandTimeoutMs, 42);
        assert.strictEqual(managedDriver1.newCommandTimeoutMs, 42);
        assert.strictEqual(managedDriver2.newCommandTimeoutMs, 42);
      });
    });
  });
});
