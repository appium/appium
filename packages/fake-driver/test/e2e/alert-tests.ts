import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {initSession, deleteSession, W3C_PREFIXED_CAPS} from '../helpers';

chai.use(chaiAsPromised);

export function alertTests() {
  describe('alerts', function () {
    let driver: Awaited<ReturnType<typeof initSession>>;
    before(async function () {
      driver = await initSession(W3C_PREFIXED_CAPS);
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
        expect(e).to.be.an('error');
        expect((e as Error).message).to.include(noAlertMessage);
      });
    }
    it('should get text of an alert', async function () {
      await (await driver.$('#AlertButton')).click();
      expect(await driver.getAlertText()).to.equal('Fake Alert');
    });
    it('should set the text of an alert', async function () {
      await driver.sendAlertText('foo');
      expect(await driver.getAlertText()).to.equal('foo');
    });
    it('should not do other things while an alert is there', async function () {
      try {
        await (await driver.$('#AlertButton')).click();
        await (await driver.$('#nav')).click();
        this.fail('should have thrown an error');
      } catch (err) {
        expect(err).to.be.an('error');
        expect((err as Error).message).to.include('modal dialog was open, blocking this operation');
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
