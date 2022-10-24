import BaseDriver from '../../../lib';
import {driverUnitTestSuite} from '@appium/driver-test-support';

const {expect} = chai;

driverUnitTestSuite(BaseDriver, {
  platformName: 'iOS',
  'appium:deviceName': 'Delorean',
});

describe('BaseDriver', function () {
  describe('constructor', function () {
    it('should initialize "opts"', function () {
      const driver = new BaseDriver();
      expect(driver.opts).to.exist;
    });
  });
});
