import { initSession, deleteSession, W3C_PREFIXED_CAPS } from '../helpers';

function contextTests () {
  describe('contexts, webviews, frames', function () {
    let driver;
    before (async function () {
      driver = await initSession(W3C_PREFIXED_CAPS);
    });
    after(async function () {
      return await deleteSession(driver);
    });
    it('should get current context', async function () {
      await driver.getContext()
              .should.eventually.become('NATIVE_APP');
    });
    it('should get contexts', async function () {
      await driver.getContexts()
              .should.eventually.become(['NATIVE_APP', 'PROXY', 'WEBVIEW_1']);
    });
    it('should not set context that is not there', async function () {
      await driver.switchContext('WEBVIEW_FOO')
              .should.eventually.be.rejectedWith(/No such context found/);
    });
    it('should set context', async function () {
      await driver.switchContext('WEBVIEW_1');
      await driver.getContext().should.eventually.become('WEBVIEW_1');
    });
    it('should find webview elements in a webview', async function () {
      await (await driver.$('//*')).getTagName()
              .should.eventually.become('html');
    });
    it('should not switch to a frame that is not there', async function () {
      await driver.switchToFrame(2).should.eventually.be.rejectedWith(/frame could not be found/);
    });
    it('should switch to an iframe', async function () {
      await driver.switchToFrame(1);
      await driver.getTitle().should.eventually.become('Test iFrame');
    });
    it('should switch back to default frame', async function () {
      await driver.switchToFrame(null);
      await driver.getTitle().should.eventually.become('Test Webview');
    });
    it('should go back to native context', async function () {
      await driver.switchContext('NATIVE_APP');
      await (await driver.$('//*')).getTagName().should.eventually.become('AppiumAUT');
    });
    it('should not set a frame in a native context', async function () {
      await driver.switchContext('NATIVE_APP');
      await driver.switchToFrame(1).should.eventually.be.rejectedWith(/could not be executed in the current context/);
    });
  });
}

export default contextTests;
