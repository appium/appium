import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {initSession, deleteSession, W3C_PREFIXED_CAPS} from '../helpers';

chai.use(chaiAsPromised);

function alertTests() {
  describe('alerts', function () {
    let driver: Awaited<ReturnType<typeof initSession>>;
    before(async function () {
      driver = await initSession(W3C_PREFIXED_CAPS);
    });
    after(async function () {
      return await deleteSession(driver);
    });

    it('should not work with alerts when one is not present', async function () {
      const noAlertMessage = 'modal dialog when one was not open';
      let e: unknown = await driver.getAlertText().catch((err: Error) => err);
      expect(e).to.be.an('error');
      expect((e as Error).message).to.include(noAlertMessage);
      e = await driver.sendAlertText('foo').catch((err: Error) => err);
      expect(e).to.be.an('error');
      expect((e as Error).message).to.include(noAlertMessage);
      e = await driver.acceptAlert().catch((err: Error) => err);
      expect(e).to.be.an('error');
      expect((e as Error).message).to.include(noAlertMessage);
      e = await driver.dismissAlert().catch((err: Error) => err);
      expect(e).to.be.an('error');
      expect((e as Error).message).to.include(noAlertMessage);
    });
    it('should get text of an alert', async function () {
      await (await driver.$('#AlertButton')).click();
      expect(await driver.getAlertText()).to.equal('Fake Alert');
    });
    it('should set the text of an alert', async function () {
      await driver.sendAlertText('foo');
      expect(await driver.getAlertText()).to.equal('foo');
    });
    it('should not do other things while an alert is there', async function () {
      await (await driver.$('#AlertButton')).click();
      const e = await (await driver.$('#nav')).click().catch((err: Error) => err);
      expect(e).to.be.an('error');
      expect((e as Error).message).to.include('modal dialog');
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

export default alertTests;
