import { initSession, deleteSession, DEFAULT_CAPS } from './helpers';

function contextTests () {
  describe('contexts, webviews, frames', function () {
    let driver;
    before (async function () {
      driver = await initSession(DEFAULT_CAPS);
    });
    after(async function () {
      await deleteSession();
    });
    it('should get current context', async function () {
      await driver.currentContext()
              .should.eventually.become('NATIVE_APP');
    });
    it('should get contexts', async function () {
      await driver.contexts()
              .should.eventually.become(['NATIVE_APP', 'WEBVIEW_1']);
    });
    it('should not set context that is not there', async function () {
      await driver.context('WEBVIEW_FOO')
              .should.eventually.be.rejectedWith(/35/);
    });
    it('should set context', async function () {
      await driver.context('WEBVIEW_1').currentContext()
              .should.eventually.become('WEBVIEW_1');
    });
    it('should find webview elements in a webview', async function () {
      await driver.elementByXPath('//*').getTagName()
              .should.eventually.become('html');
    });
    it('should not switch to a frame that is not there', async function () {
      await driver.frame('foo').should.eventually.be.rejectedWith(/8/);
    });
    it('should switch to an iframe', async function () {
      await driver.frame('iframe1').title()
              .should.eventually.become('Test iFrame');
    });
    it('should switch back to default frame', async function () {
      await driver.frame(null).title()
              .should.eventually.become('Test Webview');
    });
    it('should go back to native context', async function () {
      await driver.context('NATIVE_APP').elementByXPath('//*').getTagName()
              .should.eventually.become('app');
    });
    it('should not set a frame in a native context', async function () {
      await driver.frame('iframe1').should.eventually.be.rejectedWith(/36/);
    });
  });
}

export default contextTests;
