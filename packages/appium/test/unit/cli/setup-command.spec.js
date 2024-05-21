import { system } from '@appium/support';
import {getPresetDrivers} from '../../../lib/cli/setup-command';

const expect = chai.expect;

describe('SetupCommand', function () {
  describe('getPresetDrivers', function () {
    it('for macos environment', function () {
      const expected = system.isMac() ? ['uiautomator2', 'xcuitest', 'espresso'] : ['uiautomator2', 'espresso'];
      expect(getPresetDrivers('mobile')).eql(expected);
    });
  });
});
