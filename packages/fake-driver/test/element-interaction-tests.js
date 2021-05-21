import chai from 'chai';
import { initSession, deleteSession, DEFAULT_CAPS } from './helpers';

const should = chai.should();

function elementTests () {
  describe('element interaction and introspection', function () {
    let driver;
    before (async function () {
      driver = await initSession(DEFAULT_CAPS);
    });
    after(async function () {
      await deleteSession();
    });

    it('should not send keys to an invalid element', async function () {
      await driver.elementByXPath('//MockListItem').sendKeys('test value')
              .should.eventually.be.rejectedWith(/12/);
    });
    it('should send keys to an element and retrieve text', async function () {
      let el = await driver.elementByXPath('//MockInputField');
      await el.sendKeys('test value');
      (await el.text()).should.eql('test value');
    });
    it('should not clear an invalid element', async function () {
      await driver.elementByXPath('//MockListItem').clear()
              .should.eventually.be.rejectedWith(/12/);
    });
    it('should clear an element', async function () {
      let el = driver.elementByXPath('//MockInputField');
      (await el.text()).should.not.eql('');
      await el.clear();
      (await el.text()).should.eql('');
    });
    it('should not click an invisible element', async function () {
      await driver.elementById('Button1').click()
              .should.eventually.be.rejectedWith(/12/);
    });
    it('should click an element and get its attributes', async function () {
      let el = driver.elementById('Button2');
      await el.click();
      await el.click();
      await el.click();
      (await el.getAttribute('clicks')).should.equal(3);
    });
    it('should get the name of an element', async function () {
      let el = await driver.elementByClassName('MockInputField');
      (await el.getTagName()).should.equal('MockInputField');
      el = await driver.elementById('wv');
      (await el.getTagName()).should.equal('MockWebView');
    });
    it('should detect whether an element is displayed', async function () {
      let el = driver.elementById('Button1');
      (await el.isDisplayed()).should.equal(false);
      el = driver.elementById('Button2');
      (await el.isDisplayed()).should.equal(true);
    });
    it('should detect whether an element is enabled', async function () {
      let el = driver.elementById('Button1');
      (await el.isEnabled()).should.equal(false);
      el = driver.elementById('Button2');
      (await el.isEnabled()).should.equal(true);
    });
    it('should detect whether an element is selected', async function () {
      let el = driver.elementById('Button1');
      (await el.isSelected()).should.equal(false);
      el = driver.elementById('Button2');
      (await el.isSelected()).should.equal(true);
    });
    it('should get the location on screen of an element', async function () {
      let el = driver.elementById('nav');
      (await el.getLocation()).should.eql({x: 1, y: 1});
    });
    it('should get the location on screen of an element with float vals', async function () {
      let el = driver.elementById('lv');
      (await el.getLocation()).should.eql({x: 20.8, y: 15.3});
    });
    it('should get the location in view of an element', async function () {
      let el = driver.elementById('nav');
      (await el.getLocationInView()).should.eql({x: 1, y: 1});
    });
    it('should get the location in view of an element with float vals', async function () {
      let el = driver.elementById('lv');
      (await el.getLocationInView()).should.eql({x: 20.8, y: 15.3});
    });

    it('should get the size of an element', async function () {
      let el = await driver.elementById('nav');
      (await el.getSize()).should.eql({width: 100, height: 100});
    });
    it('should get the size of an element with float vals', async function () {
      let el = await driver.elementById('wv');
      (await el.getSize()).should.eql({width: 20.8, height: 20.5});
    });
    it('should determine element equality', async function () {
      let el1 = await driver.elementById('wv');
      let el2 = await driver.elementById('wv');
      (await el1.equals(el2)).should.equal(true);
    });
    it('should determine element inequality', async function () {
      let el1 = await driver.elementById('wv');
      let el2 = await driver.elementById('lv');
      (await el1.equals(el2)).should.equal(false);
    });

    it('should not get the css property of an element when not in a webview', async function () {
      await driver.elementById('Button1').getComputedCss('height')
              .should.eventually.be.rejectedWith(/36/);
    });
    it('should get the css property of an element when in a webview', async function () {
      await driver.context('WEBVIEW_1');
      let el = await driver.elementByTagName('body');
      (await el.getComputedCss('background-color')).should.equal('#000');
    });
    it('should return null for an unspecified css property', async function () {
      let el = await driver.elementByTagName('body');
      should.equal(await el.getComputedCss('font-size'), null);
    });
  });
}

export default elementTests;
