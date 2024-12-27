// eslint-disable-next-line import/named
import {createSandbox} from 'sinon';
import {system} from '@appium/support';
import {getPresetDrivers} from '../../../lib/cli/setup-command';

describe('SetupCommand', function () {
  let sandbox;
  let expect;

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
    expect = chai.expect;
  });

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
      expect(getPresetDrivers('mobile')).eql(['uiautomator2', 'xcuitest', 'espresso']);
      expect(getPresetDrivers('browser')).eql(['safari', 'gecko', 'chromium']);
      expect(getPresetDrivers('desktop')).eql(['mac2']);
    });

    it('for drivers on Windows environment', function () {
      sandbox.stub(system, 'isMac').returns(false);
      sandbox.stub(system, 'isWindows').returns(true);
      expect(getPresetDrivers('mobile')).eql(['uiautomator2', 'espresso']);
      expect(getPresetDrivers('browser')).eql(['gecko', 'chromium']);
      expect(getPresetDrivers('desktop')).eql(['windows']);
    });

    it('for drivers on Linux environment', function () {
      sandbox.stub(system, 'isMac').returns(false);
      sandbox.stub(system, 'isWindows').returns(false);
      expect(getPresetDrivers('mobile')).eql(['uiautomator2', 'espresso']);
      expect(getPresetDrivers('browser')).eql(['gecko', 'chromium']);
      expect(getPresetDrivers('desktop')).eql([]);
    });
  });
});
