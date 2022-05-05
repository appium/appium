import {initSession, deleteSession, W3C_PREFIXED_CAPS} from '../helpers';
import chaiWebdriverIOAsync from 'chai-webdriverio-async';

function findElementTests() {
  describe('finding elements', function () {
    let driver;
    before(async function () {
      driver = await initSession(W3C_PREFIXED_CAPS);
      chai.use(chaiWebdriverIOAsync(driver));
    });
    after(async function () {
      return await deleteSession(driver);
    });

    describe('by XPath', function () {
      it('should find a single element by xpath', async function () {
        (await driver.$('//MockWebView')).should.be.existing();
      });
      it('should not find a single element that is not there', async function () {
        (await driver.$('//dontexist')).should.not.be.existing();
      });
      it('should find multiple elements', async function () {
        (await driver.$$('//MockListItem')).should.have.count(3);
      });
    });

    describe('by classname', function () {
      it('should find a single element by class', async function () {
        (await driver.$('.MockWebView')).should.be.existing();
      });

      it('should not find a single element by class that is not there', async function () {
        (await driver.$('.dontexist')).should.not.be.existing();
      });
    });

    describe('using bad selectors', function () {
      it('should not find a single element with bad selector', async function () {
        await chai.expect(driver.$('badsel')).to.eventually.be.rejectedWith({code: 32});
      });

      it('should not find multiple elements with bad selector', async function () {
        await chai.expect(driver.$$('badsel')).to.eventually.be.rejectedWith({code: 32});
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
        (await el.$$('title')).should.have.count(2);
      });
      it(`should not find an element that doesn't exist from another element`, async function () {
        let el = await driver.$('#1');
        (await el.$('marquee')).should.not.be.existing();
      });
      it(`should not find multiple elements that don't exist from another element`, async function () {
        let el = await driver.$('#1');
        (await el.$$('marquee')).should.have.count(0);
      });
      it('should not find elements if root element does not exist', async function () {
        let el = await driver.$('#blub');
        await chai.expect(el.$('body')).to.eventually.be.rejectedWith(/Can't call \$/);
      });
    });
  });
}

export default findElementTests;
