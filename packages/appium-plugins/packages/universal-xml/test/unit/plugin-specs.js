import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import UniversalXMLPlugin from '../../index';
import BaseDriver from 'appium-base-driver';
import { XML_IOS, XML_ANDROID, XML_IOS_TRANSFORMED, XML_ANDROID_TRANSFORMED } from '../fixtures';
import { runQuery, getNodeAttrVal } from '../../lib/xpath';

chai.use(chaiAsPromised);
chai.should();

describe('UniversalXMLPlugin', function () {
  const next = () => true;
  const p = new UniversalXMLPlugin();
  describe('getPageSource', function () {
    const driver = new BaseDriver();
    it('should transform page source for ios', async function () {
      driver.getPageSource = () => XML_IOS;
      driver.caps = {platformName: 'iOS'};
      await p.getPageSource(next, driver).should.eventually.eql(XML_IOS_TRANSFORMED);
    });
    it('should transform page source for android', async function () {
      driver.getPageSource = () => XML_ANDROID;
      driver.caps = {platformName: 'Android'};
      driver.opts = {appPackage: 'io.cloudgrey.the_app'};
      await p.getPageSource(next, driver).should.eventually.eql(XML_ANDROID_TRANSFORMED);
    });
  });

  describe('findElement(s)', function () {
    const driver = new BaseDriver();
    it('should turn an xpath query into another query run on the original ios source', async function () {
      driver.getPageSource = () => XML_IOS;
      driver.caps = {platformName: 'iOS'};
      // mock out the findElement function to just return an xml node from the fixture
      driver.findElement = (strategy, selector) => {
        const nodes = runQuery(selector, XML_IOS.replace(/<\/?AppiumAUT>/, ''));
        return nodes[0];
      };
      const node = await p.findElement(next, driver, 'xpath', '//TextInput[@axId="username"]');
      getNodeAttrVal(node, 'value').should.eql('alice');
      node.nodeName.should.eql('XCUIElementTypeTextField');
    });

    it('should turn an xpath query into another query run on the original android source', async function () {
      driver.getPageSource = () => XML_ANDROID;
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
  });
});
