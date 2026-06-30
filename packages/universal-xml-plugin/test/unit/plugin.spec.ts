import type { Constraints } from '@appium/types';
import { BaseDriver } from 'appium/driver';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { UniversalXMLPlugin } from '../../lib/plugin';
import { getNodeAttrVal, runQuery } from '../../lib/xpath';
import { FIXTURES, readFixture } from '../fixtures';

describe('UniversalXMLPlugin', function () {
  let next: () => Promise<any>;
  const p = new UniversalXMLPlugin('test');

  describe('getPageSource', function () {
    const driver = new BaseDriver<Constraints>({} as any);
    it('should transform page source for ios', async function () {
      (driver as any).getCurrentContext = () => 'NATIVE_APP';
      next = (driver as any).getPageSource = () => readFixture(FIXTURES.XML_IOS);
      (driver as any).caps = { platformName: 'iOS' };
      assert.equal(await p.getPageSource(next, driver as any), await readFixture(FIXTURES.XML_IOS_TRANSFORMED));
    });
    it('should transform page source for android', async function () {
      (driver as any).getCurrentContext = () => 'NATIVE_APP';
      next = (driver as any).getPageSource = () => readFixture(FIXTURES.XML_ANDROID);
      (driver as any).caps = { platformName: 'Android' };
      (driver as any).opts = { appPackage: 'io.cloudgrey.the_app' };
      assert.equal(await p.getPageSource(next, driver as any), await readFixture(FIXTURES.XML_ANDROID_TRANSFORMED));
    });
  });

  describe('findElement(s)', function () {
    const driver = new BaseDriver<Constraints>({} as any);
    it('should turn an xpath query into another query run on the original ios source', async function () {
      (driver as any).getCurrentContext = () => 'NATIVE_APP';
      next = (driver as any).getPageSource = () => readFixture(FIXTURES.XML_IOS);
      (driver as any).caps = { platformName: 'iOS' };
      // mock out the findElement function to just return an xml node from the fixture
      (driver as any).findElement = async (strategy: string, selector: string) => {
        const nodes = runQuery(selector, (await readFixture(FIXTURES.XML_IOS)).replace(/<\/?AppiumAUT>/g, ''));
        return nodes[0];
      };
      const node = await p.findElement(next, driver as any, 'xpath', '//TextInput[@axId="username"]');
      assert.equal(getNodeAttrVal(node as any, 'value'), 'alice');
      assert.equal((node as any).nodeName, 'XCUIElementTypeTextField');
    });

    it('should turn an xpath query into another query run on the original android source', async function () {
      (driver as any).getCurrentContext = () => 'NATIVE_APP';
      next = (driver as any).getPageSource = () => readFixture(FIXTURES.XML_ANDROID);
      (driver as any).caps = { platformName: 'Android' };
      (driver as any).opts = { appPackage: 'io.cloudgrey.the_app' };
      (driver as any).findElement = async (strategy: string, selector: string) => {
        const nodes = runQuery(selector, await readFixture(FIXTURES.XML_ANDROID));
        return nodes[0];
      };
      const node = await p.findElement(next, driver as any, 'xpath', '//TextInput[@axId="username"]');
      assert.equal(getNodeAttrVal(node as any, 'content-desc'), 'username');
      assert.equal((node as any).nodeName, 'android.widget.EditText');
    });

    it('should not modify the xpath query and proxy the call to underlying driver', async function () {
      (driver as any).getCurrentContext = () => 'WEB_VIEW';
      (driver as any).findElement = () => ({});
      (driver as any).caps = { platformName: 'Android' };
      (driver as any).opts = { appPackage: 'io.cloudgrey.the_app' };
      const selector = '//div[@id="section-1"]';
      next = async () => {
        const nodes = runQuery(selector, await readFixture(FIXTURES.XML_WEBVIEW));
        return Promise.resolve(nodes[0]);
      };
      const node = await p.findElement(next, driver as any, 'xpath', selector);
      assert.equal(getNodeAttrVal(node as any, 'id'), 'section-1');
      assert.equal((node as any).nodeName, 'div');
    });
  });
});
