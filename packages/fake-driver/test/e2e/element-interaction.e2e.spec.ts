import assert from 'node:assert/strict';
import {describe, it, before, after} from 'node:test';

import {deleteSession, initSession, W3C_PREFIXED_CAPS} from '../helpers.js';

export function elementTests(context: {port: number}) {
  describe('element interaction and introspection', function () {
    let driver: Awaited<ReturnType<typeof initSession>>;

    before(async function () {
      driver = await initSession(W3C_PREFIXED_CAPS, {port: context.port});
    });
    after(async function () {
      return await deleteSession(driver);
    });

    it('should not set value on an invalid element', async function () {
      const el = await driver.$('//MockListItem');
      await assert.rejects(el.setValue('test value'), /invalid state/);
    });
    it('should set value on an element and retrieve text', async function () {
      const el = await driver.$('//MockInputField');
      await el.setValue('test value');
      assert.strictEqual(await el.getText(), 'test value');
    });
    it('should not clear an invalid element', async function () {
      await assert.rejects((await driver.$('//MockListItem')).clearValue(), /invalid state/);
    });
    it('should clear an element', async function () {
      const el = await driver.$('//MockInputField');
      await el.setValue('test value');
      assert.notStrictEqual(await el.getText(), '');
      await el.clearValue();
      assert.strictEqual(await el.getText(), '');
    });
    it('should not click an invisible element', async function () {
      await assert.rejects((await driver.$('#Button1')).click(), /invalid state/);
    });
    it('should click an element and get its attributes', async function () {
      const el = await driver.$('#Button2');
      await el.click();
      await el.click();
      await el.click();
      assert.strictEqual(await el.getAttribute('clicks'), '3');
    });
    it('should get the name of an element', async function () {
      let el = await driver.$('MockInputField');
      assert.strictEqual(await el.getTagName(), 'MockInputField');
      el = await driver.$('#wv');
      assert.strictEqual(await el.getTagName(), 'MockWebView');
    });
    it('should detect whether an element is displayed', async function () {
      assert.strictEqual(await (await driver.$('#Button1')).isDisplayed(), false);
      assert.strictEqual(await (await driver.$('#Button2')).isDisplayed(), true);
    });
    it('should detect whether an element is enabled', async function () {
      assert.strictEqual(await (await driver.$('#Button1')).isEnabled(), false);
      assert.strictEqual(await (await driver.$('#Button2')).isEnabled(), true);
    });
    it('should detect whether an element is selected', async function () {
      assert.strictEqual(await (await driver.$('#Button1')).isSelected(), false);
      assert.strictEqual(await (await driver.$('#Button2')).isSelected(), true);
    });
    it('should get the rect of an element', async function () {
      const navEl = await driver.$('#nav');
      const elementId = await (navEl as any).elementId;
      assert.deepStrictEqual(await driver.getElementRect(elementId), {
        x: 1,
        y: 1,
        width: 100,
        height: 100,
      });
    });
    it('should get the rect of an element with float vals', async function () {
      const lvEl = await driver.$('#lv');
      const elementId = await (lvEl as any).elementId;
      assert.deepStrictEqual(await driver.getElementRect(elementId), {
        x: 20.8,
        y: 15.3,
        height: 2,
        width: 30.5,
      });
    });
    it('should determine element equality', async function () {
      const el1 = await driver.$('#wv');
      const el2 = await driver.$('#wv');
      assert.strictEqual(await el1.isEqual(el2 as any), true);
    });
    it('should determine element inequality', async function () {
      const el1 = await driver.$('#wv');
      const el2 = await driver.$('#lv');
      assert.strictEqual(await el1.isEqual(el2 as any), false);
    });

    it('should not get the css property of an element when not in a webview', async function () {
      const btnEl = await driver.$('#Button1');
      const elementId = await (btnEl as any).elementId;
      const e = await driver.getElementCSSValue(elementId, 'height').catch((err: Error) => err);
      assert.ok(e instanceof Error);
      assert.ok((e as Error).message.includes('could not be executed'));
    });
    it('should get the css property of an element when in a webview', async function () {
      await driver.switchContext('WEBVIEW_1');
      const bodyEl = await driver.$('body');
      const elementId = await (bodyEl as any).elementId;
      assert.strictEqual(await driver.getElementCSSValue(elementId, 'background-color'), '#000');
    });
    it('should return empty string for an unspecified css property', async function () {
      const bodyEl = await driver.$('body');
      const elementId = await (bodyEl as any).elementId;
      assert.strictEqual(await driver.getElementCSSValue(elementId, 'font-size'), '');
    });
  });
}
