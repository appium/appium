import assert from 'node:assert/strict';
import {describe, it, beforeEach, before, after, mock} from 'node:test';

import * as support from '@appium/support';
import {createSandbox, type SinonSandbox, type SinonStub} from 'sinon';

import type {getPresetDrivers as GetPresetDriversFn} from '../../../lib/cli/setup-command.js';

describe('SetupCommand', function () {
  let sandbox: SinonSandbox;
  let getPresetDrivers: typeof GetPresetDriversFn;
  let mockSystem: {isMac: SinonStub; isWindows: SinonStub};

  // `system` from `@appium/support` is a frozen ES module namespace (`import * as system from
  // './system.js'`), so sinon can't stub its methods directly; mock the whole `@appium/support`
  // module once with a plain mutable `system` replacement instead.
  before(async function () {
    sandbox = createSandbox();
    mockSystem = {isMac: sandbox.stub(), isWindows: sandbox.stub()};
    // `default` is destructured out: on Node 22, passing a `default` key through
    // `namedExports` makes `mock.module()` generate invalid synthetic module source.
    const {default: _unusedDefault, ...supportWithoutDefault} = support;
    mock.module('@appium/support', {namedExports: {...supportWithoutDefault, system: mockSystem}});
    ({getPresetDrivers} = await import('../../../lib/cli/setup-command.js'));
  });

  after(function () {
    mock.reset();
    sandbox.restore();
  });

  beforeEach(function () {
    sandbox.resetHistory();
  });

  describe('getPresetDrivers', function () {
    it('for drivers on macOS environment', function () {
      mockSystem.isMac.returns(true);
      mockSystem.isWindows.returns(false);
      assert.deepStrictEqual(getPresetDrivers('mobile'), ['uiautomator2', 'xcuitest', 'espresso']);
      assert.deepStrictEqual(getPresetDrivers('browser'), ['safari', 'gecko', 'chromium']);
      assert.deepStrictEqual(getPresetDrivers('desktop'), ['mac2']);
    });

    it('for drivers on Windows environment', function () {
      mockSystem.isMac.returns(false);
      mockSystem.isWindows.returns(true);
      assert.deepStrictEqual(getPresetDrivers('mobile'), ['uiautomator2', 'espresso']);
      assert.deepStrictEqual(getPresetDrivers('browser'), ['gecko', 'chromium']);
      assert.deepStrictEqual(getPresetDrivers('desktop'), ['windows']);
    });

    it('for drivers on Linux environment', function () {
      mockSystem.isMac.returns(false);
      mockSystem.isWindows.returns(false);
      assert.deepStrictEqual(getPresetDrivers('mobile'), ['uiautomator2', 'espresso']);
      assert.deepStrictEqual(getPresetDrivers('browser'), ['gecko', 'chromium']);
      assert.deepStrictEqual(getPresetDrivers('desktop'), []);
    });
  });
});
