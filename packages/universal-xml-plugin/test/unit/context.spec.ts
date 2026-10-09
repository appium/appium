import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {ExternalDriver, NextPluginCallback} from '@appium/types';
import {errors} from 'appium/driver.js';

import {UniversalXMLPlugin} from '../../lib/plugin.js';
import {runQuery} from '../../lib/xpath.js';
import {FIXTURES, readFixture} from '../fixtures/index.js';

async function makeDriver(platform: 'iOS' | 'Android', initialContext = 'NATIVE_APP') {
  const ios = platform === 'iOS';
  const nativeXml = await readFixture(ios ? FIXTURES.XML_IOS : FIXTURES.XML_ANDROID);
  const universalXml = await readFixture(ios ? FIXTURES.XML_IOS_TRANSFORMED : FIXTURES.XML_ANDROID_TRANSFORMED);
  const webXml = await readFixture(FIXTURES.XML_WEBVIEW);
  let context = initialContext;
  const switches: string[] = [];
  const source = async () => (context === 'NATIVE_APP' ? nativeXml : webXml);
  const setContext = async (name: string | null) => {
    if (name !== 'NATIVE_APP' && name !== 'WEBVIEW_1') {
      throw new errors.NoSuchContextError(`No context: ${name}`);
    }
    switches.push(name);
    context = name;
    return null;
  };
  const currentContext = async () => context;
  const driver = {
    caps: {platformName: platform},
    opts: {appPackage: 'io.cloudgrey.the_app'},
    getPageSource: source,
    getCurrentContext: currentContext,
    setContext,
    findElement: async (_strategy: string, selector: string) =>
      runQuery(selector, nativeXml.replace(/<\/?AppiumAUT>/g, ''))[0],
  } as unknown as ExternalDriver;
  const switchNext = (name: string | null): NextPluginCallback => async () => setContext(name);
  return {driver, source, currentContext, switchNext, switches, nativeXml, universalXml, webXml};
}

const noVirtualDelegation: NextPluginCallback = async () => assert.fail('Virtual context reached the real driver');

describe('UniversalXMLPlugin context switching', function () {
  it('should switch native source and XPath back to universal on both platforms', async function () {
    const plugin = new UniversalXMLPlugin('context-test');
    for (const platform of ['iOS', 'Android'] as const) {
      const f = await makeDriver(platform);
      const contexts = ['NATIVE_APP', 'WEBVIEW_1'];
      assert.deepEqual(await plugin.getContexts(async () => contexts, f.driver), [...contexts, 'universal-xml']);
      assert.deepEqual(contexts, ['NATIVE_APP', 'WEBVIEW_1']);
      assert.equal(await plugin.getCurrentContext(f.currentContext, f.driver), 'universal-xml');
      assert.equal(await plugin.getPageSource(f.source, f.driver), f.universalXml);

      await plugin.setContext(f.switchNext('NATIVE_APP'), f.driver, 'NATIVE_APP');
      assert.equal(await plugin.getCurrentContext(f.currentContext, f.driver), 'NATIVE_APP');
      assert.equal(await plugin.getPageSource(f.source, f.driver), f.nativeXml);
      const nativeElement = {ELEMENT: 'native-selector-result'};
      assert.strictEqual(await plugin.findElement(async () => nativeElement, f.driver, 'xpath', '//native'), nativeElement);
      const nativeElements = [nativeElement];
      assert.strictEqual(await plugin.findElements(async () => nativeElements, f.driver, 'xpath', '//native'), nativeElements);

      await plugin.setContext(noVirtualDelegation, f.driver, 'universal-xml');
      assert.equal(await plugin.getCurrentContext(f.currentContext, f.driver), 'universal-xml');
      assert.equal(await plugin.getPageSource(f.source, f.driver), f.universalXml);
      const element = await plugin.findElement(noVirtualDelegation, f.driver, 'xpath', '//TextInput[@axId="username"]');
      assert.equal((element as any).nodeName, platform === 'iOS' ? 'XCUIElementTypeTextField' : 'android.widget.EditText');
      assert.deepEqual(f.switches, ['NATIVE_APP']);
    }
  });

  it('should preserve webview delegation and mode after rejected switches', async function () {
    const plugin = new UniversalXMLPlugin('context-test');
    const f = await makeDriver('Android');
    await assert.rejects(plugin.setContext(f.switchNext('missing'), f.driver, 'missing'), errors.NoSuchContextError);
    assert.equal(await plugin.getCurrentContext(f.currentContext, f.driver), 'universal-xml');
    assert.equal(await plugin.getPageSource(f.source, f.driver), f.universalXml);

    await plugin.setContext(f.switchNext('WEBVIEW_1'), f.driver, 'WEBVIEW_1');
    assert.equal(await plugin.getCurrentContext(f.currentContext, f.driver), 'WEBVIEW_1');
    assert.equal(await plugin.getPageSource(f.source, f.driver), f.webXml);
    const webElement = {ELEMENT: 'web-selector-result'};
    assert.strictEqual(await plugin.findElement(async () => webElement, f.driver, 'xpath', '//div'), webElement);
    await plugin.setContext(noVirtualDelegation, f.driver, 'universal-xml');
    assert.equal(await f.currentContext(), 'NATIVE_APP');
    assert.equal(await plugin.getPageSource(f.source, f.driver), f.universalXml);
    assert.deepEqual(f.switches, ['WEBVIEW_1', 'NATIVE_APP']);

    const rejected = await makeDriver('iOS', 'WEBVIEW_1');
    rejected.driver.setContext = async () => {
      throw new errors.NoSuchContextError('Native context is unavailable');
    };
    await assert.rejects(plugin.setContext(noVirtualDelegation, rejected.driver, 'universal-xml'), errors.NoSuchContextError);
    assert.equal(await plugin.getCurrentContext(rejected.currentContext, rejected.driver), 'WEBVIEW_1');
    assert.equal(await plugin.getPageSource(rejected.source, rejected.driver), rejected.webXml);
  });

  it('should isolate session modes and discard state when a session ends', async function () {
    const plugin = new UniversalXMLPlugin('context-test');
    const first = await makeDriver('iOS');
    const second = await makeDriver('iOS');
    await plugin.setContext(first.switchNext('NATIVE_APP'), first.driver, 'NATIVE_APP');
    assert.equal(await plugin.getPageSource(first.source, first.driver), first.nativeXml);
    assert.equal(await plugin.getPageSource(second.source, second.driver), second.universalXml);
    assert.equal(await plugin.deleteSession(async () => 'deleted', first.driver), 'deleted');
    assert.equal(await plugin.getPageSource(first.source, first.driver), first.universalXml);
  });

  it('should preserve detailed context shape without advertising unsupported contexts', async function () {
    const plugin = new UniversalXMLPlugin('context-test');
    const f = await makeDriver('iOS');
    const contexts = [{id: 'NATIVE_APP', title: 'Native'}, {id: 'WEBVIEW_1', title: 'Web'}];
    assert.deepEqual(await plugin.getContexts(async () => contexts, f.driver), [
      ...contexts,
      {id: 'universal-xml', title: 'Native'},
    ]);
    assert.equal(contexts.length, 2);
    const webOnly = ['WEBVIEW_1'];
    assert.strictEqual(await plugin.getContexts(async () => webOnly, f.driver), webOnly);
    const unsupported = {...f.driver, setContext: undefined} as ExternalDriver;
    assert.strictEqual(await plugin.getContexts(async () => contexts, unsupported), contexts);
    await assert.rejects(plugin.setContext(noVirtualDelegation, unsupported, 'universal-xml'), errors.NoSuchContextError);
  });
});
