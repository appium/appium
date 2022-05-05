import {initSession, deleteSession, W3C_PREFIXED_CAPS} from '../helpers';

function alertTests() {
  describe('alerts', function () {
    let driver;
    before(async function () {
      driver = await initSession(W3C_PREFIXED_CAPS);
    });
    after(async function () {
      return await deleteSession(driver);
    });

    it('should not work with alerts when one is not present', async function () {
      await driver.getAlertText().should.eventually.be.rejectedWith({code: 27});
      await driver.sendAlertText('foo').should.eventually.be.rejectedWith({code: 27});
      await driver.acceptAlert().should.eventually.be.rejectedWith({code: 27});
      await driver.dismissAlert().should.eventually.be.rejectedWith({code: 27});
    });
    it('should get text of an alert', async function () {
      await (await driver.$('#AlertButton')).click();
      (await driver.getAlertText()).should.equal('Fake Alert');
    });
    it('should set the text of an alert', async function () {
      await driver.sendAlertText('foo');
      (await driver.getAlertText()).should.equal('foo');
    });
    it('should not do other things while an alert is there', async function () {
      await (await driver.$('#nav')).click().should.eventually.be.rejectedWith({code: 26});
    });
    it.skip('should accept an alert', function () {
      driver.acceptAlert().$('nav').click().nodeify();
    });
    it.skip('should not set the text of the wrong kind of alert', function () {
      driver
        .$('AlertButton2')
        .click()
        .alertText()
        .should.eventually.become('Fake Alert 2')
        .alertKeys('foo')
        .should.be.rejectedWith(/12/)
        .nodeify();
    });
    it.skip('should dismiss an alert', function () {
      driver.acceptAlert().$('nav').click().nodeify();
    });
  });
}

export default alertTests;
