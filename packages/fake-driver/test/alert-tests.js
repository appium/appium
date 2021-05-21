import { initSession, deleteSession, DEFAULT_CAPS } from './helpers';

function alertTests () {
  describe('alerts', function () {
    let driver;
    before (async function () {
      driver = await initSession(DEFAULT_CAPS);
    });
    after(async function () {
      await deleteSession();
    });

    it('should not work with alerts when one is not present', async function () {
      await driver.alertText().should.eventually.be.rejectedWith(/27/);
      await driver.alertKeys('foo').should.eventually.be.rejectedWith(/27/);
      await driver.acceptAlert().should.eventually.be.rejectedWith(/27/);
      await driver.dismissAlert().should.eventually.be.rejectedWith(/27/);
    });
    it('should get text of an alert', async function () {
      await driver.elementById('AlertButton').click();
      (await driver.alertText()).should.equal('Fake Alert');
    });
    it('should set the text of an alert', async function () {
      await driver.alertKeys('foo');
      (await driver.alertText()).should.equal('foo');
    });
    it('should not do other things while an alert is there', async function () {
      await driver.elementById('nav').click()
              .should.eventually.be.rejectedWith(/26/);
    });
    it.skip('should accept an alert', function () {
      driver
        .acceptAlert()
        .elementById('nav')
        .click()
        .nodeify();
    });
    it.skip('should not set the text of the wrong kind of alert', function () {
      driver
        .elementById('AlertButton2')
        .click()
        .alertText()
          .should.eventually.become('Fake Alert 2')
        .alertKeys('foo')
          .should.be.rejectedWith(/12/)
        .nodeify();
    });
    it.skip('should dismiss an alert', function () {
      driver
        .acceptAlert()
        .elementById('nav')
        .click()
        .nodeify();
    });
  });
}

export default alertTests;
