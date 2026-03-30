import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {initSession, deleteSession, W3C_PREFIXED_CAPS} from '../helpers';

chai.use(chaiAsPromised);

export function elementTests() {
  describe('element interaction and introspection', function () {
    let driver: Awaited<ReturnType<typeof initSession>>;

    before(async function () {
      driver = await initSession(W3C_PREFIXED_CAPS);
    });
    after(async function () {
      return await deleteSession(driver);
    });

    it('should not set value on an invalid element', async function () {
      const el = await driver.$('//MockListItem');
      await expect(el.setValue('test value')).to.be.rejectedWith(/invalid state/);
    });
    it('should set value on an element and retrieve text', async function () {
      const el = await driver.$('//MockInputField');
      await el.setValue('test value');
      expect(await el.getText()).to.equal('test value');
    });
    it('should not clear an invalid element', async function () {
      await expect(
        (await driver.$('//MockListItem')).clearValue()
      ).to.be.rejectedWith(/invalid state/);
    });
    it('should clear an element', async function () {
      const el = await driver.$('//MockInputField');
      await el.setValue('test value');
      expect(await el.getText()).to.not.equal('');
      await el.clearValue();
      expect(await el.getText()).to.equal('');
    });
    it('should not click an invisible element', async function () {
      await expect((await driver.$('#Button1')).click()).to.be.rejectedWith(/invalid state/);
    });
    it('should click an element and get its attributes', async function () {
      const el = await driver.$('#Button2');
      await el.click();
      await el.click();
      await el.click();
      expect(await el.getAttribute('clicks')).to.equal('3');
    });
    it('should get the name of an element', async function () {
      let el = await driver.$('MockInputField');
      expect(await el.getTagName()).to.equal('MockInputField');
      el = await driver.$('#wv');
      expect(await el.getTagName()).to.equal('MockWebView');
    });
    it('should detect whether an element is displayed', async function () {
      expect(await (await driver.$('#Button1')).isDisplayed()).to.be.false;
      expect(await (await driver.$('#Button2')).isDisplayed()).to.be.true;
    });
    it('should detect whether an element is enabled', async function () {
      expect(await (await driver.$('#Button1')).isEnabled()).to.be.false;
      expect(await (await driver.$('#Button2')).isEnabled()).to.be.true;
    });
    it('should detect whether an element is selected', async function () {
      expect(await (await driver.$('#Button1')).isSelected()).to.be.false;
      expect(await (await driver.$('#Button2')).isSelected()).to.be.true;
    });
    it('should get the rect of an element', async function () {
      const navEl = await driver.$('#nav');
      const elementId = await (navEl as any).elementId;
      expect(await driver.getElementRect(elementId)).to.eql({
        x: 1,
        y: 1,
        width: 100,
        height: 100,
      });
    });
    it('should get the rect of an element with float vals', async function () {
      const lvEl = await driver.$('#lv');
      const elementId = await (lvEl as any).elementId;
      expect(await driver.getElementRect(elementId)).to.eql({
        x: 20.8,
        y: 15.3,
        height: 2,
        width: 30.5,
      });
    });
    it('should determine element equality', async function () {
      const el1 = await driver.$('#wv');
      const el2 = await driver.$('#wv');
      expect(await el1.isEqual(el2 as any)).to.equal(true);
    });
    it('should determine element inequality', async function () {
      const el1 = await driver.$('#wv');
      const el2 = await driver.$('#lv');
      expect(await el1.isEqual(el2 as any)).to.equal(false);
    });

    it('should not get the css property of an element when not in a webview', async function () {
      const btnEl = await driver.$('#Button1');
      const elementId = await (btnEl as any).elementId;
      const e = await driver
        .getElementCSSValue(elementId, 'height')
        .catch((err: Error) => err);
      expect(e).to.be.an('error');
      expect((e as Error).message).to.include('could not be executed');
    });
    it('should get the css property of an element when in a webview', async function () {
      await driver.switchContext('WEBVIEW_1');
      const bodyEl = await driver.$('body');
      const elementId = await (bodyEl as any).elementId;
      expect(await driver.getElementCSSValue(elementId, 'background-color')).to.equal('#000');
    });
    it('should return empty string for an unspecified css property', async function () {
      const bodyEl = await driver.$('body');
      const elementId = await (bodyEl as any).elementId;
      expect(await driver.getElementCSSValue(elementId, 'font-size')).to.equal('');
    });
  });
}

