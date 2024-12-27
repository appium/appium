import {BaseDriver} from '../../../lib';
import {driverUnitTestSuite} from '@appium/driver-test-support';

driverUnitTestSuite(BaseDriver, {
  platformName: 'iOS',
  'appium:deviceName': 'Delorean',
});

describe('BaseDriver', function () {
  let expect;

  before(async function () {
    const chai = await import('chai');
    chai.should();
    expect = chai.expect;
  });

  describe('constructor', function () {
    it('should initialize "opts"', function () {
      const driver = new BaseDriver();
      expect(driver.opts).to.exist;
    });
  });
});
