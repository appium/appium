import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import UniversalXMLPlugin from '../../index';
import BaseDriver from 'appium-base-driver';
import { XML_IOS, XML_ANDROID, XML_IOS_TRANSFORMED, XML_ANDROID_TRANSFORMED } from '../fixtures';

chai.use(chaiAsPromised);
chai.should();

describe('UniversalXMLPlugin#handle', function () {
  const next = () => true;
  const driver = new BaseDriver();
  driver.getPageSource = () => XML_IOS;
  driver.caps = {platformName: 'iOS'};
  driver.opts = {appPackage: 'io.cloudgrey.the_app'};
  const p = new UniversalXMLPlugin();
  describe('getPageSource', function () {
    it('should transform page source for ios', async function () {
      await p.handle(next, driver, 'getPageSource').should.eventually.eql(XML_IOS_TRANSFORMED);
    });
    it('should transform page source for android', async function () {
      driver.getPageSource = () => XML_ANDROID;
      driver.caps = {platformName: 'Android'};
      await p.handle(next, driver, 'getPageSource').should.eventually.eql(XML_ANDROID_TRANSFORMED);
    });
  });
});
