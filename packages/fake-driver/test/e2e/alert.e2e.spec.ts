import assert from 'node:assert/strict';
import {describe, it, before, after} from 'node:test';

import {deleteSession, initSession, W3C_PREFIXED_CAPS} from '../helpers.js';

export function alertTests(context: {port: number}) {
  describe('alerts', function () {
    let driver: Awaited<ReturnType<typeof initSession>>;
    before(async function () {
      driver = await initSession(W3C_PREFIXED_CAPS, {port: context.port});
    });
    after(async function () {
      return await deleteSession(driver);
    });

    const noAlertMessage = 'modal dialog when one was not open';
    const noAlertCases: Array<[string, () => Promise<unknown>]> = [
      ['getAlertText', () => driver.getAlertText()],
      ['sendAlertText', () => driver.sendAlertText('foo')],
      ['acceptAlert', () => driver.acceptAlert()],
      ['dismissAlert', () => driver.dismissAlert()],
    ];
    for (const [name, fn] of noAlertCases) {
      it(`should reject ${name} when no alert is present`, async function () {
        const e: unknown = await fn().catch((err: Error) => err);
        assert.ok(e instanceof Error);
        assert.ok((e as Error).message.includes(noAlertMessage));
      });
    }
    it('should get text of an alert', async function () {
      await (await driver.$('#AlertButton')).click();
      assert.strictEqual(await driver.getAlertText(), 'Fake Alert');
    });
    it('should set the text of an alert', async function () {
      await driver.sendAlertText('foo');
      assert.strictEqual(await driver.getAlertText(), 'foo');
    });
    it('should not do other things while an alert is there', async function () {
      try {
        await (await driver.$('#AlertButton')).click();
        await (await driver.$('#nav')).click();
        throw new Error('should have thrown an error');
      } catch (err) {
        assert.ok(err instanceof Error);
        assert.ok((err as Error).message.includes('modal dialog was open, blocking this operation'));
      }
    });
    it.skip('should accept an alert', function () {
      (driver.acceptAlert() as any).$('nav').click().nodeify();
    });
    it.skip('should not set the text of the wrong kind of alert', function () {
      (driver.$('AlertButton2') as any).click().alertText().nodeify();
    });
    it.skip('should dismiss an alert', function () {
      (driver.acceptAlert() as any).$('nav').click().nodeify();
    });
  });
}
