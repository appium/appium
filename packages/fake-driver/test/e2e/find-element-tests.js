import {initSession, deleteSession, W3C_PREFIXED_CAPS} from '../helpers.cjs';

function findElementTests() {
  describe('finding elements', function () {
    let driver;
    let expect;

    before(async function () {
      const chai = await import('chai');
      const chaiAsPromised = await import('chai-as-promised');
      chai.use(chaiAsPromised.default);
      chai.should();
      expect = chai.expect;

      driver = await initSession(W3C_PREFIXED_CAPS);
    });
    after(async function () {
      return await deleteSession(driver);
    });

    describe('by XPath', function () {
      it('should find a single element by xpath', async function () {
        (await driver.$('//MockWebView')).should.not.be.empty;
      });
      it('should not find a single element that is not there', async function () {
        (await driver.$$('//dontexist')).length.should.equal(0);
      });
      it('should find multiple elements', async function () {
        (await driver.$$('//MockListItem')).length.should.be.equal(3);
      });
    });

    describe('by classname', function () {
      it('should find a single element by class', async function () {
        (await driver.$('.MockWebView')).should.not.be.empty;
      });

      it('should not find a single element by class that is not there', async function () {
        (await driver.$$('.dontexist')).length.should.equal(0);;
      });
    });

    describe('using bad selectors', function () {
      it('should not find a single element with bad selector', async function () {
        await expect(driver.$('badsel')).to.eventually.be.rejectedWith({code: 32});
      });

      it('should not find multiple elements with bad selector', async function () {
        await expect(driver.$$('badsel')).to.eventually.be.rejectedWith({code: 32});
      });
    });

    describe('via element selectors', function () {
      it('should find an element from another element', async function () {
        let el = await driver.$('#1');
        let title = await el.$('title');
        let earlierTitle = await driver.$('title');
        await earlierTitle.isEqual(title).should.eventually.equal(false);
      });
      it('should find multiple elements from another element', async function () {
        let el = await driver.$('html');
        (await el.$$('title')).length.should.equal(2);
      });
      it(`should not find multiple elements that don't exist from another element`, async function () {
        let el = await driver.$('#1');
        (await el.$$('marquee')).length.should.equal(0);
      });
      it('should not find elements if root element does not exist', async function () {
        let el = await driver.$('#blub');
        await expect(el.$('body')).to.eventually.be.rejectedWith(/Can't call \$/);
      });
    });
  });
}

export default findElementTests;
