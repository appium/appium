import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {initSession, deleteSession, W3C_PREFIXED_CAPS} from '../helpers';

chai.use(chaiAsPromised);

export function findElementTests() {
  describe('finding elements', function () {
    let driver: Awaited<ReturnType<typeof initSession>>;

    before(async function () {
      driver = await initSession(W3C_PREFIXED_CAPS);
    });
    after(async function () {
      return await deleteSession(driver);
    });

    describe('by XPath', function () {
      it('should find a single element by xpath', async function () {
        expect(await driver.$('//MockWebView')).to.not.be.empty;
      });
      it('should not find a single element that is not there', async function () {
        expect((await driver.$$('//dontexist')).length).to.equal(0);
      });
      it('should find multiple elements', async function () {
        expect((await driver.$$('//MockListItem')).length).to.equal(3);
      });
    });

    describe('by classname', function () {
      it('should find a single element by class', async function () {
        expect(await driver.$('.MockWebView')).to.not.be.empty;
      });

      it('should not find a single element by class that is not there', async function () {
        expect((await driver.$$('.dontexist')).length).to.equal(0);
      });
    });

    describe('using bad selectors', function () {
      it('should not find a single element with bad selector', async function () {
        try {
          await driver.$('badsel');
        } catch (e: any) {
          expect(e).to.be.an('error');
          expect(e.message).to.include('invalid selector');
          return;
        }
        expect.fail('should have thrown');
      });

      it('should not find multiple elements with bad selector', async function () {
        try {
          await driver.$$('badsel');
        } catch (e: any) {
          expect(e).to.be.an('error');
          expect(e.message).to.include('invalid selector');
          return;
        }
        expect.fail('should have thrown');
      });
    });

    describe('via element selectors', function () {
      it('should find an element from another element', async function () {
        const el = await driver.$('#1');
        const title = await el.$('title');
        const earlierTitle = await driver.$('title');
        expect(await earlierTitle.isEqual(title as any)).to.equal(false);
      });
      it('should find multiple elements from another element', async function () {
        const el = await driver.$('html');
        expect((await el.$$('title')).length).to.equal(2);
      });
      it(`should not find multiple elements that don't exist from another element`, async function () {
        const el = await driver.$('#1');
        expect((await el.$$('marquee')).length).to.equal(0);
      });
      it('should not find elements if root element does not exist', async function () {
        const el = await driver.$('#blub');
        await expect(el.$('body')).to.be.rejectedWith(/Can't call \$/);
      });
    });
  });
}
