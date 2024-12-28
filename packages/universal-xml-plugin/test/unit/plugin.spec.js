import {UniversalXMLPlugin} from '../..';
import {BaseDriver} from 'appium/driver';
import {
  XML_IOS,
  XML_ANDROID,
  XML_IOS_TRANSFORMED,
  XML_ANDROID_TRANSFORMED,
  XML_WEBVIEW,
} from '../fixtures';
import {runQuery, getNodeAttrVal} from '../../lib/xpath';

describe('UniversalXMLPlugin', function () {
  let next;
  const p = new UniversalXMLPlugin();

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
  });

  describe('getPageSource', function () {
    const driver = new BaseDriver();
    it('should transform page source for ios', async function () {
      driver.getCurrentContext = () => 'NATIVE_APP';
      next = driver.getPageSource = () => XML_IOS;
      driver.caps = {platformName: 'iOS'};
      await p.getPageSource(next, driver).should.eventually.eql(XML_IOS_TRANSFORMED);
    });
    it('should transform page source for android', async function () {
      driver.getCurrentContext = () => 'NATIVE_APP';
      next = driver.getPageSource = () => XML_ANDROID;
      driver.caps = {platformName: 'Android'};
      driver.opts = {appPackage: 'io.cloudgrey.the_app'};
      await p.getPageSource(next, driver).should.eventually.eql(XML_ANDROID_TRANSFORMED);
    });
  });

  describe('findElement(s)', function () {
    const driver = new BaseDriver();
    it('should turn an xpath query into another query run on the original ios source', async function () {
      driver.getCurrentContext = () => 'NATIVE_APP';
      next = driver.getPageSource = () => XML_IOS;
      driver.caps = {platformName: 'iOS'};
      // mock out the findElement function to just return an xml node from the fixture
      driver.findElement = (strategy, selector) => {
        const nodes = runQuery(selector, XML_IOS.replace(/<\/?AppiumAUT>/g, ''));
        return nodes[0];
      };
      const node = await p.findElement(next, driver, 'xpath', '//TextInput[@axId="username"]');
      getNodeAttrVal(node, 'value').should.eql('alice');
      node.nodeName.should.eql('XCUIElementTypeTextField');
    });

    it('should turn an xpath query into another query run on the original android source', async function () {
      driver.getCurrentContext = () => 'NATIVE_APP';
      next = driver.getPageSource = () => XML_ANDROID;
      driver.caps = {platformName: 'Android'};
      driver.opts = {appPackage: 'io.cloudgrey.the_app'};
      driver.findElement = (strategy, selector) => {
        const nodes = runQuery(selector, XML_ANDROID);
        return nodes[0];
      };
      const node = await p.findElement(next, driver, 'xpath', '//TextInput[@axId="username"]');
      getNodeAttrVal(node, 'content-desc').should.eql('username');
      node.nodeName.should.eql('android.widget.EditText');
    });

    it('should not modify the xpath query and proxy the call to underlying driver', async function () {
      driver.getCurrentContext = () => 'WEB_VIEW';
      driver.findElement = () => {};
      driver.caps = {platformName: 'Android'};
      driver.opts = {appPackage: 'io.cloudgrey.the_app'};
      const selector = '//div[@id="section-1"]';
      next = () => {
        const nodes = runQuery(selector, XML_WEBVIEW);
        return nodes[0];
      };
      const node = await p.findElement(next, driver, 'xpath', selector);
      getNodeAttrVal(node, 'id').should.eql('section-1');
      node.nodeName.should.eql('div');
    });
  });
});
