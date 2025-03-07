import {initSession, deleteSession, W3C_PREFIXED_CAPS} from '../helpers.cjs';

function elementTests() {
  describe('element interaction and introspection', function () {
    let driver;
    let should;

    before(async function () {
      const chai = await import('chai');
      const chaiAsPromised = await import('chai-as-promised');
      chai.use(chaiAsPromised.default);
      should = chai.should();

      driver = await initSession(W3C_PREFIXED_CAPS);
    });
    after(async function () {
      return await deleteSession(driver);
    });

    it('should not set value on an invalid element', async function () {
      const el = await driver.$('//MockListItem');
      await el.setValue('test value').should.eventually.be.rejectedWith(/invalid state/);
    });
    it('should set value on an element and retrieve text', async function () {
      let el = await driver.$('//MockInputField');
      await el.setValue('test value');
      (await el.getText()).should.equal('test value');
    });
    it('should not clear an invalid element', async function () {
      await (await driver.$('//MockListItem'))
        .clearValue()
        .should.eventually.be.rejectedWith(/invalid state/);
    });
    it('should clear an element', async function () {
      let el = await driver.$('//MockInputField');
      await el.setValue('test value');
      (await el.getText()).should.not.equal('');
      await el.clearValue();
      (await el.getText()).should.equal('');
    });
    it('should not click an invisible element', async function () {
      await (await driver.$('#Button1')).click().should.eventually.be.rejectedWith(/invalid state/);
    });
    it('should click an element and get its attributes', async function () {
      let el = await driver.$('#Button2');
      await el.click();
      await el.click();
      await el.click();
      (await el.getAttribute('clicks')).should.equal(3);
    });
    it('should get the name of an element', async function () {
      let el = await driver.$('MockInputField');
      (await el.getTagName()).should.equal('MockInputField');
      el = await driver.$('#wv');
      (await el.getTagName()).should.equal('MockWebView');
    });
    it('should detect whether an element is displayed', async function () {
      (await (await driver.$('#Button1')).isDisplayed()).should.be.false;
      (await (await driver.$('#Button2')).isDisplayed()).should.be.true;
    });
    it('should detect whether an element is enabled', async function () {
      (await (await driver.$('#Button1')).isEnabled()).should.be.false;
      (await (await driver.$('#Button2')).isEnabled()).should.be.true;
    });
    it('should detect whether an element is selected', async function () {
      (await (await driver.$('#Button1')).isSelected()).should.be.false;
      (await (await driver.$('#Button2')).isSelected()).should.be.true;
    });
    it('should get the rect of an element', async function () {
      let {elementId} = await driver.$('#nav');
      (await driver.getElementRect(elementId)).should.eql({
        x: 1,
        y: 1,
        width: 100,
        height: 100,
      });
    });
    it('should get the rect of an element with float vals', async function () {
      let {elementId} = await driver.$('#lv');
      (await driver.getElementRect(elementId)).should.eql({
        x: 20.8,
        y: 15.3,
        height: 2,
        width: 30.5,
      });
    });
    it('should determine element equality', async function () {
      let el1 = await driver.$('#wv');
      let el2 = await driver.$('#wv');
      (await el1.isEqual(el2)).should.equal(true);
    });
    it('should determine element inequality', async function () {
      let el1 = await driver.$('#wv');
      let el2 = await driver.$('#lv');
      (await el1.isEqual(el2)).should.equal(false);
    });

    it('should not get the css property of an element when not in a webview', async function () {
      const {elementId} = await driver.$('#Button1');
      await driver
        .getElementCSSValue(elementId, 'height')
        .should.eventually.be.rejectedWith({code: 36});
    });
    it('should get the css property of an element when in a webview', async function () {
      await driver.switchContext('WEBVIEW_1');
      let {elementId} = await driver.$('body');
      (await driver.getElementCSSValue(elementId, 'background-color')).should.equal('#000');
    });
    it('should return empty string for an unspecified css property', async function () {
      let {elementId} = await driver.$('body');
      should.equal(await driver.getElementCSSValue(elementId, 'font-size'), '');
    });
  });
}

export default elementTests;
