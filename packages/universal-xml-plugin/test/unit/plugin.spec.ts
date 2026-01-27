import {UniversalXMLPlugin} from '../../lib/plugin';
import {BaseDriver} from 'appium/driver';
import {
  XML_IOS,
  XML_ANDROID,
  XML_IOS_TRANSFORMED,
  XML_ANDROID_TRANSFORMED,
  XML_WEBVIEW,
} from '../fixtures';
import {runQuery, getNodeAttrVal} from '../../lib/xpath';
import type {Constraints} from '@appium/types';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';

use(chaiAsPromised);

describe('UniversalXMLPlugin', function () {
  let next: () => Promise<any>;
  const p = new UniversalXMLPlugin('test');

  describe('getPageSource', function () {
    const driver = new BaseDriver<Constraints>({} as any);
    it('should transform page source for ios', async function () {
      (driver as any).getCurrentContext = () => 'NATIVE_APP';
      next = (driver as any).getPageSource = () => Promise.resolve(XML_IOS);
      (driver as any).caps = {platformName: 'iOS'};
      await expect(p.getPageSource(next, driver as any)).to.eventually.eql(XML_IOS_TRANSFORMED);
    });
    it('should transform page source for android', async function () {
      (driver as any).getCurrentContext = () => 'NATIVE_APP';
      next = (driver as any).getPageSource = () => Promise.resolve(XML_ANDROID);
      (driver as any).caps = {platformName: 'Android'};
      (driver as any).opts = {appPackage: 'io.cloudgrey.the_app'};
      await expect(p.getPageSource(next, driver as any)).to.eventually.eql(XML_ANDROID_TRANSFORMED);
    });
  });

  describe('findElement(s)', function () {
    const driver = new BaseDriver<Constraints>({} as any);
    it('should turn an xpath query into another query run on the original ios source', async function () {
      (driver as any).getCurrentContext = () => 'NATIVE_APP';
      next = (driver as any).getPageSource = () => Promise.resolve(XML_IOS);
      (driver as any).caps = {platformName: 'iOS'};
      // mock out the findElement function to just return an xml node from the fixture
      (driver as any).findElement = (strategy: string, selector: string) => {
        const nodes = runQuery(selector, XML_IOS.replace(/<\/?AppiumAUT>/g, ''));
        return nodes[0];
      };
      const node = await p.findElement(next, driver as any, 'xpath', '//TextInput[@axId="username"]');
      expect(getNodeAttrVal(node, 'value')).to.eql('alice');
      expect(node.nodeName).to.eql('XCUIElementTypeTextField');
    });

    it('should turn an xpath query into another query run on the original android source', async function () {
      (driver as any).getCurrentContext = () => 'NATIVE_APP';
      next = (driver as any).getPageSource = () => Promise.resolve(XML_ANDROID);
      (driver as any).caps = {platformName: 'Android'};
      (driver as any).opts = {appPackage: 'io.cloudgrey.the_app'};
      (driver as any).findElement = (strategy: string, selector: string) => {
        const nodes = runQuery(selector, XML_ANDROID);
        return nodes[0];
      };
      const node = await p.findElement(next, driver as any, 'xpath', '//TextInput[@axId="username"]');
      expect(getNodeAttrVal(node, 'content-desc')).to.eql('username');
      expect(node.nodeName).to.eql('android.widget.EditText');
    });

    it('should not modify the xpath query and proxy the call to underlying driver', async function () {
      (driver as any).getCurrentContext = () => 'WEB_VIEW';
      (driver as any).findElement = () => ({});
      (driver as any).caps = {platformName: 'Android'};
      (driver as any).opts = {appPackage: 'io.cloudgrey.the_app'};
      const selector = '//div[@id="section-1"]';
      next = () => {
        const nodes = runQuery(selector, XML_WEBVIEW);
        return Promise.resolve(nodes[0]);
      };
      const node = await p.findElement(next, driver as any, 'xpath', selector);
      expect(getNodeAttrVal(node, 'id')).to.eql('section-1');
      expect(node.nodeName).to.eql('div');
    });
  });
});
