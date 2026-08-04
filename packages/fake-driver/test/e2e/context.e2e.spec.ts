import assert from 'node:assert/strict';
import {describe, it, before, after} from 'node:test';

import {deleteSession, initSession, W3C_PREFIXED_CAPS} from '../helpers';

export function contextTests(context: {port: number}) {
  describe('contexts, webviews, frames', function () {
    let driver: Awaited<ReturnType<typeof initSession>>;
    before(async function () {
      driver = await initSession(W3C_PREFIXED_CAPS, {port: context.port});
    });
    after(async function () {
      return await deleteSession(driver);
    });
    it('should get current context', async function () {
      assert.strictEqual(await driver.getContext(), 'NATIVE_APP');
    });
    it('should get contexts', async function () {
      assert.deepStrictEqual(await driver.getContexts(), ['NATIVE_APP', 'PROXY', 'WEBVIEW_1']);
    });
    it('should not set context that is not there', async function () {
      await assert.rejects(driver.switchContext('WEBVIEW_FOO'), /No such context found/);
    });
    it('should set context', async function () {
      await driver.switchContext('WEBVIEW_1');
      assert.strictEqual(await driver.getContext(), 'WEBVIEW_1');
    });
    it('should find webview elements in a webview', async function () {
      assert.strictEqual(await (await driver.$('//*')).getTagName(), 'html');
    });
    it('should not switch to a frame that is not there', async function () {
      await assert.rejects(driver.switchToFrame(2), /frame could not be found/);
    });
    it('should switch to an iframe', async function () {
      await driver.switchToFrame(1);
      assert.strictEqual(await driver.getTitle(), 'Test iFrame');
    });
    it('should switch back to default frame', async function () {
      await driver.switchToFrame(null);
      assert.strictEqual(await driver.getTitle(), 'Test Webview');
    });
    it('should go back to native context', async function () {
      await driver.switchContext('NATIVE_APP');
      assert.strictEqual(await (await driver.$('//*')).getTagName(), 'AppiumAUT');
    });
    it('should not set a frame in a native context', async function () {
      await driver.switchContext('NATIVE_APP');
      await assert.rejects(driver.switchToFrame(1), /could not be executed in the current context/);
    });
  });
}
