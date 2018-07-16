import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { getDriver, helpers, DRIVER_MAP, AUTOMATION_NAMES, PLATFORM_NAMES }
  from '../lib/driver-utils';


chai.use(chaiAsPromised);

const TEST_DRIVER_MAP = {
  DriverOne: {
    driverClass: "DriverOne",
    packageName: "appium-one-driver",
    automationName: "OneAuto",
    platformName: "One",
    repository: "https://github.com/appium/appium-one-driver",
    constraints: [{
      type: "capability",
      capability: "platformVersion",
      condition: ">=10.0.0",
      alternativeDriver: "DriverTwo",
      message: "DriverOne points to DriverTwo"
    }]
  },
  DriverTwo: {
    driverClass: "TwoDriver",
    packageName: "appium-two-driver",
    platformName: "Two",
    repository: "https://github.com/appium/appium-two-driver",
    constraints: [{
      type: "capability",
      capability: "platformVersion",
      condition: ">=11.0.0",
      alternativeDriver: "DriverThree",
      message: "DriverTwo points to DriverThree"
    }]
  },
  DriverThree: {
    driverClass: "ThreeDriver",
    packageName: "appium-three-driver",
    platformName: "Three",
    repository: "https://github.com/appium/appium-three-driver",
    constraints: [{
      type: "capability",
      capability: "platformVersion",
      condition: ">=12.0.0",
      alternativeDriver: "DriverFour",
      message: "DriverThree points to DriverFour"
    }]
  },
  DriverFour: {
    driverClass: "FourDriver",
    packageName: "appium-four-driver",
    automationName: "FourAuto",
    platformName: "Four",
    repository: "https://github.com/appium/appium-four-driver"
  },
  DriverFive: {
    driverClass: "FiveDriver",
    packageName: "appium-five-driver",
    platformName: "Five",
    repository: "https://github.com/appium/appium-five-driver"
  },
  DriverSix: {
    driverClass: "SixDriver",
    packageName: "appium-six-driver",
    platformName: "Six",
    repository: "https://github.com/appium/appium-six-driver",
    constraints: [{
      type: "capability",
      capability: "platformVersion",
      condition: ">=12.0.0",
      alternativeDriver: "DriverSix",
      message: "DriverSix points to DriverSix"
    }]
  },
};

describe('driver-utils', function () { // eslint-disable-line
  describe('getDriver', function () {
    let getDriverClassStub;
    before(function () {
      // stub out the method that loads the class
      getDriverClassStub = sinon.stub(helpers, 'getDriverClass').callsFake(function (packageName, driverClass) {
        return `${packageName}, ${driverClass}`;
      });
      helpers.injectDriverMap(TEST_DRIVER_MAP);
    });
    after(function () {
      // restore the real driver map
      helpers.injectDriverMap(DRIVER_MAP);
      getDriverClassStub.restore();
    });

    describe('AUTOMATION_NAMES', function () {
      it('should have all the automationNames from the driver map', function () {
        AUTOMATION_NAMES.length.should.eql(3);
        AUTOMATION_NAMES.should.eql([
          'Appium',
          'OneAuto',
          'FourAuto',
        ]);
      });
    });

    describe('PLATFORM_NAMES', function () {
      it('should have all the platformNames from the driver map', function () {
        PLATFORM_NAMES.length.should.eql(6);
        PLATFORM_NAMES.should.eql([
          'One',
          'Two',
          'Three',
          'Four',
          'Five',
          'Six',
        ]);
      });
    });

    describe('with automationName in caps', function () {
      it('should get the correct driver if automationName matches', function () {
        const driver = getDriver({
          automationName: 'FourAuto',
          platformName: 'Four',
        });
        driver.should.eql('appium-four-driver, FourDriver');
      });
      it('should fall back to platformName if automationName does not exist', function () {
        const driver = getDriver({
          automationName: 'FiveAuto',
          platformName: 'Five',
        });
        driver.should.eql('appium-five-driver, FiveDriver');
      });
      it('should go through single level of constraints if available', function () {
        const driver = getDriver({
          automationName: 'OneAuto',
          platformName: 'One',
          platformVersion: '10.1.0',
        });
        driver.should.eql('appium-two-driver, TwoDriver');
      });
      it('should go through multiple level of constraints if available', function () {
        const driver = getDriver({
          automationName: 'OneAuto',
          platformName: 'One',
          platformVersion: '12.1.0',
        });
        driver.should.eql('appium-four-driver, FourDriver');
      });
      it('should handle circular constraint', function () {
        const driver = getDriver({
          automationName: 'SixAuto',
          platformName: 'Six',
          platformVersion: '12.1.0',
        });
        driver.should.eql('appium-six-driver, SixDriver');
      });
      it('should fail if neither automationName nor platformName exist', function () {
        (() => {
          getDriver({
            automationName: 'SevenAuto',
            platformName: 'Seven',
          });
        }).should.throw(`Could not find a driver for automationName 'SevenAuto' and platformName 'Seven'.`);
      });
    });

    describe('without automationName in caps', function () {
      it('should get the correct driver if platformName matches', function () {
        const driver = getDriver({
          platformName: 'Four',
        });
        driver.should.eql('appium-four-driver, FourDriver');
      });
      it('should go through single level of constraints if available', function () {
        const driver = getDriver({
          platformName: 'One',
          platformVersion: '10.1.0',
        });
        driver.should.eql('appium-two-driver, TwoDriver');
      });
      it('should go through multiple level of constraints if available', function () {
        const driver = getDriver({
          platformName: 'One',
          platformVersion: '12.1.0',
        });
        driver.should.eql('appium-four-driver, FourDriver');
      });
      it('should fail if platformName does not exist', function () {
        (() => {
          getDriver({
            platformName: 'Seven',
          });
        }).should.throw(`Could not find a driver for platformName 'Seven'.`);
      });
    });
  });
});
