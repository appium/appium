import assert from 'node:assert/strict';
import {beforeEach, describe, it} from 'node:test';

import type {Constraints} from '@appium/types';
import {BaseDriver, errors} from 'appium/driver.js';

import {UniversalXMLPlugin} from '../../lib/plugin.js';
import {getNodeAttrVal, runQuery} from '../../lib/xpath.js';
import {FIXTURES, readFixture} from '../fixtures/index.js';

describe('UniversalXMLPlugin', function () {
  let next: () => Promise<any>;
  const p = new UniversalXMLPlugin('test');

  describe('getPageSource', function () {
    const driver = new BaseDriver<Constraints>({} as any);
    it('should transform page source for ios', async function () {
      (driver as any).getCurrentContext = () => 'NATIVE_APP';
      next = (driver as any).getPageSource = () => readFixture(FIXTURES.XML_IOS);
      (driver as any).caps = {platformName: 'iOS'};
      assert.equal(await p.getPageSource(next, driver as any), await readFixture(FIXTURES.XML_IOS_TRANSFORMED));
    });
    it('should transform page source for android', async function () {
      (driver as any).getCurrentContext = () => 'NATIVE_APP';
      next = (driver as any).getPageSource = () => readFixture(FIXTURES.XML_ANDROID);
      (driver as any).caps = {platformName: 'Android'};
      (driver as any).opts = {appPackage: 'io.cloudgrey.the_app'};
      assert.equal(await p.getPageSource(next, driver as any), await readFixture(FIXTURES.XML_ANDROID_TRANSFORMED));
    });
  });

  describe('findElement(s)', function () {
    const driver = new BaseDriver<Constraints>({} as any);
    it('should turn an xpath query into another query run on the original ios source', async function () {
      (driver as any).getCurrentContext = () => 'NATIVE_APP';
      next = (driver as any).getPageSource = () => readFixture(FIXTURES.XML_IOS);
      (driver as any).caps = {platformName: 'iOS'};
      // mock out the findElement function to just return an xml node from the fixture
      (driver as any).findElement = async (strategy: string, selector: string) => {
        const nodes = runQuery(selector, (await readFixture(FIXTURES.XML_IOS)).replace(/<\/?AppiumAUT>/g, ''));
        return nodes[0];
      };
      const node = await p.findElement(next, driver as any, 'xpath', '//TextInput[@axId="username"]');
      assert.equal(getNodeAttrVal(node as any, 'value'), 'alice');
      assert.equal((node as any).nodeName, 'XCUIElementTypeTextField');
    });

    it('should return every match when an ios xpath query matches multiple nodes', async function () {
      (driver as any).getCurrentContext = () => 'NATIVE_APP';
      next = (driver as any).getPageSource = () => readFixture(FIXTURES.XML_IOS);
      (driver as any).caps = {platformName: 'iOS'};
      (driver as any).findElements = async (strategy: string, selector: string) =>
        runQuery(selector, (await readFixture(FIXTURES.XML_IOS)).replace(/<\/?AppiumAUT>/g, ''));
      const nodes = await p.findElements(next, driver as any, 'xpath', '//Window');
      assert.equal(nodes.length, 2);
      for (const node of nodes) {
        assert.equal((node as any).nodeName, 'XCUIElementTypeWindow');
      }
    });

    it('should turn an xpath query into another query run on the original android source', async function () {
      (driver as any).getCurrentContext = () => 'NATIVE_APP';
      next = (driver as any).getPageSource = () => readFixture(FIXTURES.XML_ANDROID);
      (driver as any).caps = {platformName: 'Android'};
      (driver as any).opts = {appPackage: 'io.cloudgrey.the_app'};
      (driver as any).findElement = async (strategy: string, selector: string) => {
        const nodes = runQuery(selector, await readFixture(FIXTURES.XML_ANDROID));
        return nodes[0];
      };
      const node = await p.findElement(next, driver as any, 'xpath', '//TextInput[@axId="username"]');
      assert.equal(getNodeAttrVal(node as any, 'content-desc'), 'username');
      assert.equal((node as any).nodeName, 'android.widget.EditText');
    });

    it('should find android nodes by the enabled attribute', async function () {
      const source = (await readFixture(FIXTURES.XML_ANDROID)).replace(
        'content-desc="username" checkable="false" checked="false" clickable="true" enabled="true"',
        'content-desc="username" checkable="false" checked="false" clickable="true" enabled="false"',
      );
      (driver as any).getCurrentContext = () => 'NATIVE_APP';
      next = (driver as any).getPageSource = async () => source;
      (driver as any).caps = {platformName: 'Android'};
      (driver as any).opts = {appPackage: 'io.cloudgrey.the_app'};
      (driver as any).findElement = async (strategy: string, selector: string) => runQuery(selector, source)[0];
      const node = await p.findElement(next, driver as any, 'xpath', '//TextInput[@enabled="false"]');
      assert.equal(getNodeAttrVal(node as any, 'content-desc'), 'username');
      assert.equal(getNodeAttrVal(node as any, 'enabled'), 'false');
    });

    it('should not modify the xpath query and proxy the call to underlying driver', async function () {
      (driver as any).getCurrentContext = () => 'WEB_VIEW';
      (driver as any).findElement = () => ({});
      (driver as any).caps = {platformName: 'Android'};
      (driver as any).opts = {appPackage: 'io.cloudgrey.the_app'};
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

  describe('universalXml: setEnabled / universalXml: isEnabled', function () {
    let plugin: UniversalXMLPlugin;
    let driver: BaseDriver<Constraints>;
    const unexpectedNext = async () => {
      throw new Error('next() should not have been called');
    };
    const isEnabled = async () => await plugin.execute(unexpectedNext, driver as any, 'universalXml: isEnabled', []);
    const setEnabled = async (enabled: unknown) =>
      await plugin.execute(unexpectedNext, driver as any, 'universalXml: setEnabled', [{enabled}]);

    beforeEach(function () {
      plugin = new UniversalXMLPlugin('test');
      driver = new BaseDriver<Constraints>({} as any);
      (driver as any).getCurrentContext = () => 'NATIVE_APP';
      (driver as any).caps = {platformName: 'iOS'};
    });

    it('should have translation enabled by default', async function () {
      assert.equal(await isEnabled(), true);
    });

    it('should turn translation off and back on', async function () {
      assert.equal(await setEnabled(false), undefined);
      assert.equal(await isEnabled(), false);
      await setEnabled(true);
      assert.equal(await isEnabled(), true);
    });

    it('should keep the setting to its own plugin instance', async function () {
      await setEnabled(false);
      const otherSessionPlugin = new UniversalXMLPlugin('test');
      assert.equal(
        await otherSessionPlugin.execute(unexpectedNext, driver as any, 'universalXml: isEnabled', []),
        true,
      );
    });

    it('should reject a value that is not a boolean', async function () {
      await assert.rejects(setEnabled('false'), errors.InvalidArgumentError);
      assert.equal(await isEnabled(), true);
    });

    it('should reject a call without the enabled param', async function () {
      await assert.rejects(
        plugin.execute(unexpectedNext, driver as any, 'universalXml: setEnabled', []),
        errors.InvalidArgumentError,
      );
      assert.equal(await isEnabled(), true);
    });

    it('should pass other execute methods on to next', async function () {
      const result = await plugin.execute(async () => 'from next', driver as any, 'mobile: getContexts', []);
      assert.equal(result, 'from next');
    });

    it('should return the page source untouched while disabled', async function () {
      await setEnabled(false);
      const source = await readFixture(FIXTURES.XML_IOS);
      assert.equal(await plugin.getPageSource(() => readFixture(FIXTURES.XML_IOS), driver as any), source);
    });

    it('should translate the page source again once re-enabled', async function () {
      await setEnabled(false);
      await setEnabled(true);
      assert.equal(
        await plugin.getPageSource(() => readFixture(FIXTURES.XML_IOS), driver as any),
        await readFixture(FIXTURES.XML_IOS_TRANSFORMED),
      );
    });

    it('should pass xpath queries on unchanged while disabled', async function () {
      await setEnabled(false);
      const fail = () => {
        throw new Error('the driver should not have been called');
      };
      (driver as any).getCurrentContext = fail;
      (driver as any).getPageSource = fail;
      (driver as any).findElement = fail;
      (driver as any).findElements = fail;
      const element = {'element-6066-11e4-a52e-4f735466cecf': 'from-next'};
      const selector = '//TextInput[@axId="username"]';
      assert.equal(await plugin.findElement(async () => element, driver as any, 'xpath', selector), element);
      assert.deepEqual(await plugin.findElements(async () => [element], driver as any, 'xpath', selector), [element]);
    });
  });
});
