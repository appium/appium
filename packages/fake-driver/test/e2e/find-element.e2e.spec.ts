import assert from 'node:assert/strict';
import {describe, it, before, after} from 'node:test';

import {deleteSession, initSession, W3C_PREFIXED_CAPS} from '../helpers';

export function findElementTests(context: {port: number}) {
  describe('finding elements', function () {
    let driver: Awaited<ReturnType<typeof initSession>>;

    before(async function () {
      driver = await initSession(W3C_PREFIXED_CAPS, {port: context.port});
    });
    after(async function () {
      return await deleteSession(driver);
    });

    describe('by XPath', function () {
      it('should find a single element by xpath', async function () {
        const el = await driver.$('//MockWebView');
        assert.notStrictEqual(Object.keys(el).length, 0);
      });
      it('should not find a single element that is not there', async function () {
        assert.strictEqual((await driver.$$('//dontexist')).length, 0);
      });
      it('should find multiple elements', async function () {
        assert.strictEqual((await driver.$$('//MockListItem')).length, 3);
      });
    });

    describe('by classname', function () {
      it('should find a single element by class', async function () {
        const el = await driver.$('.MockWebView');
        assert.notStrictEqual(Object.keys(el).length, 0);
      });

      it('should not find a single element by class that is not there', async function () {
        assert.strictEqual((await driver.$$('.dontexist')).length, 0);
      });
    });

    describe('using bad selectors', function () {
      it('should not find a single element with bad selector', async function () {
        try {
          await driver.$('badsel');
        } catch (e: any) {
          assert.ok(e instanceof Error);
          assert.ok(e.message.includes('invalid selector'));
          return;
        }
        assert.fail('should have thrown');
      });

      it('should not find multiple elements with bad selector', async function () {
        try {
          await driver.$$('badsel');
        } catch (e: any) {
          assert.ok(e instanceof Error);
          assert.ok(e.message.includes('invalid selector'));
          return;
        }
        assert.fail('should have thrown');
      });
    });

    describe('via element selectors', function () {
      it('should find an element from another element', async function () {
        const el = await driver.$('#1');
        const title = await el.$('title');
        const earlierTitle = await driver.$('title');
        assert.strictEqual(await earlierTitle.isEqual(title as any), false);
      });
      it('should find multiple elements from another element', async function () {
        const el = await driver.$('html');
        assert.strictEqual((await el.$$('title')).length, 2);
      });
      it(`should not find multiple elements that don't exist from another element`, async function () {
        const el = await driver.$('#1');
        assert.strictEqual((await el.$$('marquee')).length, 0);
      });
      it('should not find elements if root element does not exist', async function () {
        const el = await driver.$('#blub');
        await assert.rejects(async () => await el.$('body'), /Can't call \$/);
      });
    });
  });
}
