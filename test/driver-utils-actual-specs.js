// transpile:mocha

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { XCUITestDriver } from 'appium-xcuitest-driver';
import { IosDriver } from 'appium-ios-driver';
import { getDriver } from '../lib/driver-utils';


chai.should();
chai.use(chaiAsPromised);

describe('driver-utils', function () {
  describe('getDriver', function () {
    it('should not blow up if user does not provide platformName', function () {
      (() => { getDriver({}); }).should.throw(/platformName/);
    });
    it('should get XCUITestDriver driver for automationName of XCUITest', function () {
      const driver = getDriver({
        platformName: 'iOS',
        automationName: 'XCUITest'
      });
      driver.should.be.an.instanceof(Function);
      driver.should.equal(XCUITestDriver);
    });
    it('should get iosdriver for ios < 10', function () {
      let caps = {
        platformName: 'iOS',
        platformVersion: '8.0',
      };
      let driver = getDriver(caps);
      driver.should.be.an.instanceof(Function);
      driver.should.equal(IosDriver);

      caps.platformVersion = '8.1';
      driver = getDriver(caps);
      driver.should.equal(IosDriver);

      caps.platformVersion = '9.4';
      driver = getDriver(caps);
      driver.should.equal(IosDriver);

      caps.platformVersion = '';
      driver = getDriver(caps);
      driver.should.equal(IosDriver);

      caps.platformVersion = 'foo';
      driver = getDriver(caps);
      driver.should.equal(IosDriver);

      delete caps.platformVersion;
      driver = getDriver(caps);
      driver.should.equal(IosDriver);
    });
    it('should get xcuitestdriver for ios >= 10', function () {
      let caps = {
        platformName: 'iOS',
        platformVersion: '10',
      };
      let driver = getDriver(caps);
      driver.should.be.an.instanceof(Function);
      driver.should.equal(XCUITestDriver);

      caps.platformVersion = '10.0';
      driver = getDriver(caps);
      driver.should.equal(XCUITestDriver);

      caps.platformVersion = '10.1';
      driver = getDriver(caps);
      driver.should.equal(XCUITestDriver);

      caps.platformVersion = '12.14';
      driver = getDriver(caps);
      driver.should.equal(XCUITestDriver);
    });
  });
});
