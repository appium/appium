import assert from 'node:assert/strict';
import {after, afterEach, before, beforeEach, describe, it} from 'node:test';

import type {InitialOpts} from '@appium/types';
import {createSandbox} from 'sinon';

import {BaseDriver, errors} from '../../../lib/index.js';

describe('timeout', function () {
  let driver: BaseDriver<any, any, any, any, any>;
  let implicitWaitSpy: sinon.SinonSpy;
  let pageLoadTimeoutSpy: sinon.SinonSpy;
  let scriptTimeoutSpy: sinon.SinonSpy;
  let newCommandTimeoutSpy: sinon.SinonSpy;
  let sandbox: sinon.SinonSandbox;

  before(function () {
    driver = new BaseDriver({} as InitialOpts);
  });

  beforeEach(function () {
    sandbox = createSandbox();
    driver.implicitWaitMs = 0;
    driver.pageLoadTimeoutMs = 0;
    driver.scriptTimeoutMs = 0;
    driver.newCommandTimeoutMs = 0;
    implicitWaitSpy = sandbox.spy(driver, 'setImplicitWait');
    pageLoadTimeoutSpy = sandbox.spy(driver, 'setPageLoadTimeout');
    scriptTimeoutSpy = sandbox.spy(driver, 'setScriptTimeout');
    newCommandTimeoutSpy = sandbox.spy(driver, 'setNewCommandTimeout');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('parseTimeoutArgument', function () {
    it('should reject an invalid timeout with InvalidArgumentError', function () {
      assert.throws(() => driver.parseTimeoutArgument('abc'), errors.InvalidArgumentError);
      assert.throws(() => driver.parseTimeoutArgument(-1), errors.InvalidArgumentError);
    });
  });

  describe('timeouts', function () {
    describe('JSONWP errors', function () {
      it('should throw an error if something random is sent', async function () {
        await assert.rejects(driver.timeouts('random timeout', 'howdy'));
      });
      it('should throw an error if timeout is negative', async function () {
        await assert.rejects(driver.timeouts('random timeout', -42));
      });
      it('should throw an errors if timeout type is unknown', async function () {
        await assert.rejects(driver.timeouts('random timeout', 42));
      });
    });
    describe('W3C errors', function () {
      it('should not throw if no parameters are provided', async function () {
        await assert.doesNotReject(driver.timeouts());
      });
      it('should not throw if none of the W3C standard parameters are provided', async function () {
        await assert.doesNotReject(driver.timeouts(undefined, undefined, undefined, undefined, undefined, 100));
      });
    });
    describe('implicit wait', function () {
      it('should call setImplicitWait when given an integer using the JSONWP format', async function () {
        await driver.timeouts('implicit', 42);
        assert.strictEqual(implicitWaitSpy.calledOnce, true);
        assert.strictEqual(implicitWaitSpy.firstCall.args[0], 42);
        assert.strictEqual(driver.implicitWaitMs, 42);
      });
      it('should call setImplicitWait when given a string using the JSONWP format', async function () {
        await driver.timeouts('implicit', '42');
        assert.strictEqual(implicitWaitSpy.calledOnce, true);
        assert.strictEqual(implicitWaitSpy.firstCall.args[0], 42);
        assert.strictEqual(driver.implicitWaitMs, 42);
      });
      it('should call setImplicitWait when given an integer using the W3C format', async function () {
        await driver.timeouts(undefined, undefined, undefined, undefined, 42);
        assert.strictEqual(implicitWaitSpy.calledOnce, true);
        assert.strictEqual(implicitWaitSpy.firstCall.args[0], 42);
        assert.strictEqual(driver.implicitWaitMs, 42);
      });
    });
    describe('page load timeout', function () {
      it('should call setPageLoadTimeout when using the W3C format', async function () {
        await driver.timeouts(undefined, undefined, undefined, 42);
        assert.strictEqual(pageLoadTimeoutSpy.calledOnce, true);
        assert.strictEqual(pageLoadTimeoutSpy.firstCall.args[0], 42);
        assert.strictEqual(driver.pageLoadTimeoutMs, 42);
      });
    });
    describe('script timeout', function () {
      it('should call setScriptTimeout when using the W3C format', async function () {
        await driver.timeouts(undefined, undefined, 42);
        assert.strictEqual(scriptTimeoutSpy.calledOnce, true);
        assert.strictEqual(scriptTimeoutSpy.firstCall.args[0], 42);
        assert.strictEqual(driver.scriptTimeoutMs, 42);
      });
    });
    describe('new command timeout', function () {
      it('should call setNewCommandTimeout when using the W3C format', async function () {
        await driver.timeouts(undefined, undefined, undefined, undefined, undefined, 42);
        assert.strictEqual(newCommandTimeoutSpy.calledOnce, true);
        assert.strictEqual(newCommandTimeoutSpy.firstCall.args[0], 42);
        assert.strictEqual(driver.newCommandTimeoutMs, 42);
      });
    });
  });

  describe('set implicit wait', function () {
    it('should set the implicit wait with an integer', function () {
      driver.setImplicitWait(42);
      assert.strictEqual(driver.implicitWaitMs, 42);
    });
    describe('with managed driver', function () {
      let managedDriver1: BaseDriver<any, any, any, any, any>;
      let managedDriver2: BaseDriver<any, any, any, any, any>;
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

  describe('set page load timeout', function () {
    it('should set the page load timeout with an integer', function () {
      driver.setPageLoadTimeout(42);
      assert.strictEqual(driver.pageLoadTimeoutMs, 42);
    });
    describe('with managed driver', function () {
      let managedDriver1: BaseDriver<any, any, any, any, any>;
      let managedDriver2: BaseDriver<any, any, any, any, any>;
      before(function () {
        managedDriver1 = new BaseDriver({} as InitialOpts);
        managedDriver2 = new BaseDriver({} as InitialOpts);
        driver.addManagedDriver(managedDriver1);
        driver.addManagedDriver(managedDriver2);
      });
      after(function () {
        driver.managedDrivers = [];
      });
      it('should set the page load timeout on managed drivers', function () {
        driver.setPageLoadTimeout(42);
        assert.strictEqual(driver.pageLoadTimeoutMs, 42);
        assert.strictEqual(managedDriver1.pageLoadTimeoutMs, 42);
        assert.strictEqual(managedDriver2.pageLoadTimeoutMs, 42);
      });
    });
  });

  describe('set script timeout', function () {
    it('should set the script timeout with an integer', function () {
      driver.setScriptTimeout(42);
      assert.strictEqual(driver.scriptTimeoutMs, 42);
    });
    describe('with managed driver', function () {
      let managedDriver1: BaseDriver<any, any, any, any, any>;
      let managedDriver2: BaseDriver<any, any, any, any, any>;
      before(function () {
        managedDriver1 = new BaseDriver({} as InitialOpts);
        managedDriver2 = new BaseDriver({} as InitialOpts);
        driver.addManagedDriver(managedDriver1);
        driver.addManagedDriver(managedDriver2);
      });
      after(function () {
        driver.managedDrivers = [];
      });
      it('should set the script timeout on managed drivers', function () {
        driver.setScriptTimeout(42);
        assert.strictEqual(driver.scriptTimeoutMs, 42);
        assert.strictEqual(managedDriver1.scriptTimeoutMs, 42);
        assert.strictEqual(managedDriver2.scriptTimeoutMs, 42);
      });
    });
  });

  describe('set new command timeout', function () {
    it('should set the new command timeout with an integer', function () {
      driver.setNewCommandTimeout(42);
      assert.strictEqual(driver.newCommandTimeoutMs, 42);
    });
    describe('with managed driver', function () {
      let managedDriver1: BaseDriver<any, any, any, any, any>;
      let managedDriver2: BaseDriver<any, any, any, any, any>;
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
