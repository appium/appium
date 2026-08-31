import assert from 'node:assert/strict';
import {describe, it, beforeEach, afterEach} from 'node:test';

import {system} from '@appium/support';
import {createSandbox} from 'sinon';

import {getPresetDrivers} from '../../../lib/cli/setup-command';

describe('SetupCommand', function () {
  let sandbox: ReturnType<typeof createSandbox>;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('getPresetDrivers', function () {
    it('for drivers on macOS environment', function () {
      sandbox.stub(system, 'isMac').returns(true);
      sandbox.stub(system, 'isWindows').returns(false);
      assert.deepStrictEqual(getPresetDrivers('mobile'), ['uiautomator2', 'xcuitest', 'espresso']);
      assert.deepStrictEqual(getPresetDrivers('browser'), ['safari', 'gecko', 'chromium']);
      assert.deepStrictEqual(getPresetDrivers('desktop'), ['mac2']);
    });

    it('for drivers on Windows environment', function () {
      sandbox.stub(system, 'isMac').returns(false);
      sandbox.stub(system, 'isWindows').returns(true);
      assert.deepStrictEqual(getPresetDrivers('mobile'), ['uiautomator2', 'espresso']);
      assert.deepStrictEqual(getPresetDrivers('browser'), ['gecko', 'chromium']);
      assert.deepStrictEqual(getPresetDrivers('desktop'), ['windows']);
    });

    it('for drivers on Linux environment', function () {
      sandbox.stub(system, 'isMac').returns(false);
      sandbox.stub(system, 'isWindows').returns(false);
      assert.deepStrictEqual(getPresetDrivers('mobile'), ['uiautomator2', 'espresso']);
      assert.deepStrictEqual(getPresetDrivers('browser'), ['gecko', 'chromium']);
      assert.deepStrictEqual(getPresetDrivers('desktop'), []);
    });
  });
});
