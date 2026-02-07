import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {initSession, deleteSession, W3C_PREFIXED_CAPS} from '../helpers';

chai.use(chaiAsPromised);

function contextTests() {
  describe('contexts, webviews, frames', function () {
    let driver: Awaited<ReturnType<typeof initSession>>;
    before(async function () {
      driver = await initSession(W3C_PREFIXED_CAPS);
    });
    after(async function () {
      return await deleteSession(driver);
    });
    it('should get current context', async function () {
      await expect(driver.getContext()).to.eventually.become('NATIVE_APP');
    });
    it('should get contexts', async function () {
      await expect(driver.getContexts()).to.eventually.become([
        'NATIVE_APP',
        'PROXY',
        'WEBVIEW_1',
      ]);
    });
    it('should not set context that is not there', async function () {
      await expect(driver.switchContext('WEBVIEW_FOO')).to.be.rejectedWith(
        /No such context found/
      );
    });
    it('should set context', async function () {
      await driver.switchContext('WEBVIEW_1');
      await expect(driver.getContext()).to.eventually.become('WEBVIEW_1');
    });
    it('should find webview elements in a webview', async function () {
      await expect((await driver.$('//*')).getTagName()).to.eventually.become('html');
    });
    it('should not switch to a frame that is not there', async function () {
      await expect(driver.switchToFrame(2)).to.be.rejectedWith(/frame could not be found/);
    });
    it('should switch to an iframe', async function () {
      await driver.switchToFrame(1);
      await expect(driver.getTitle()).to.eventually.become('Test iFrame');
    });
    it('should switch back to default frame', async function () {
      await driver.switchToFrame(null);
      await expect(driver.getTitle()).to.eventually.become('Test Webview');
    });
    it('should go back to native context', async function () {
      await driver.switchContext('NATIVE_APP');
      await expect((await driver.$('//*')).getTagName()).to.eventually.become('AppiumAUT');
    });
    it('should not set a frame in a native context', async function () {
      await driver.switchContext('NATIVE_APP');
      await expect(driver.switchToFrame(1)).to.be.rejectedWith(
        /could not be executed in the current context/
      );
    });
  });
}

export default contextTests;
