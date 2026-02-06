import {createSandbox} from 'sinon';
import {system} from '@appium/support';
import {getPresetDrivers} from '../../../lib/cli/setup-command';
import {expect} from 'chai';

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
      expect(getPresetDrivers('mobile')).to.eql(['uiautomator2', 'xcuitest', 'espresso']);
      expect(getPresetDrivers('browser')).to.eql(['safari', 'gecko', 'chromium']);
      expect(getPresetDrivers('desktop')).to.eql(['mac2']);
    });

    it('for drivers on Windows environment', function () {
      sandbox.stub(system, 'isMac').returns(false);
      sandbox.stub(system, 'isWindows').returns(true);
      expect(getPresetDrivers('mobile')).to.eql(['uiautomator2', 'espresso']);
      expect(getPresetDrivers('browser')).to.eql(['gecko', 'chromium']);
      expect(getPresetDrivers('desktop')).to.eql(['windows']);
    });

    it('for drivers on Linux environment', function () {
      sandbox.stub(system, 'isMac').returns(false);
      sandbox.stub(system, 'isWindows').returns(false);
      expect(getPresetDrivers('mobile')).to.eql(['uiautomator2', 'espresso']);
      expect(getPresetDrivers('browser')).to.eql(['gecko', 'chromium']);
      expect(getPresetDrivers('desktop')).to.eql([]);
    });
  });
});
