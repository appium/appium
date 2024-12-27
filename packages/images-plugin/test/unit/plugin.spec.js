import {ImageElementPlugin} from '../../lib/plugin';
import {
  MATCH_FEATURES_MODE,
  GET_SIMILARITY_MODE,
  MATCH_TEMPLATE_MODE,
  IMAGE_STRATEGY,
} from '../../lib/constants';
import {BaseDriver} from 'appium/driver';
import {TEST_IMG_1_B64, TEST_IMG_2_B64, TEST_IMG_2_PART_B64} from '../fixtures';
import {util} from '@appium/support';

describe('ImageElementPlugin#handle', function () {
  const next = () => {};
  const driver = new BaseDriver();
  const p = new ImageElementPlugin();

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
  });

  describe('compareImages', function () {
    this.timeout(6000);
    it('should compare images via match features mode', async function () {
      const res = await p.compareImages(
        next,
        driver,
        MATCH_FEATURES_MODE,
        TEST_IMG_1_B64,
        TEST_IMG_2_B64,
        {}
      );
      res.count.should.eql(0);
    });
    it('should compare images via get similarity mode', async function () {
      const res = await p.compareImages(
        next,
        driver,
        GET_SIMILARITY_MODE,
        Buffer.from(TEST_IMG_1_B64, 'base64'),
        Buffer.from(TEST_IMG_2_B64, 'base64'),
        {}
      );
      res.score.should.be.above(0.2);
    });
    it('should compare images via match template mode', async function () {
      const res = await p.compareImages(
        next,
        driver,
        MATCH_TEMPLATE_MODE,
        TEST_IMG_1_B64,
        TEST_IMG_2_B64,
        {}
      );
      res.rect.height.should.be.above(0);
      res.rect.width.should.be.above(0);
      res.score.should.be.above(0.2);
    });
    it('should throw an error if comparison mode is not supported', async function () {
      await p
        .compareImages(next, driver, 'some mode', '', '')
        .should.eventually.be.rejectedWith(/comparison mode is unknown/);
    });
    it('should throw an error if image template is broken', async function () {
      await p.compareImages(
        next,
        driver,
        MATCH_TEMPLATE_MODE,
        Buffer.from('d1423423424'),
        Buffer.from('d1423423424')
      ).should.eventually.be.rejected;
    });
    it('should throw an error if image template is empty', async function () {
      await p.compareImages(next, driver, MATCH_TEMPLATE_MODE, Buffer.from(''), Buffer.from(''))
        .should.eventually.be.rejected;
    });
  });

  describe('findElement(s)', function () {
    driver.settings = {getSettings: () => ({})};
    driver.isW3CProtocol = () => true;
    driver.getScreenshot = () => TEST_IMG_2_B64;
    driver.getWindowRect = () => ({x: 0, y: 0, width: 64, height: 64});
    it('should defer execution to regular command if not a find command', async function () {
      const next = () => true;
      await p.handle(next, driver, 'sendKeys').should.eventually.become(true);
    });
    it('should defer execution to regular command if it is a find command but a different strategy', async function () {
      const next = () => true;
      await p.findElement(next, driver, 'xpath', '//foo/bar').should.eventually.become(true);
      await p.findElements(next, driver, 'xpath', '//foo/bar').should.eventually.become(true);
    });
    it('should find an image element inside a screenshot', async function () {
      const el = await p.findElement(next, driver, IMAGE_STRATEGY, TEST_IMG_2_PART_B64);
      util.unwrapElement(el).should.include('appium-image-element');
    });
    it('should find image elements inside a screenshot', async function () {
      const els = await p.findElements(next, driver, IMAGE_STRATEGY, TEST_IMG_2_PART_B64);
      els.should.have.length(1);
      util.unwrapElement(els[0]).should.include('appium-image-element');
    });
  });

  describe('Element interactions', function () {
    let elId;
    before(async function () {
      driver.settings = {getSettings: () => ({})};
      driver.isW3CProtocol = () => true;
      driver.getScreenshot = () => TEST_IMG_2_B64;
      driver.getWindowRect = () => ({x: 0, y: 0, width: 64, height: 64});
      const el = await p.findElement(next, driver, IMAGE_STRATEGY, TEST_IMG_2_PART_B64);
      elId = util.unwrapElement(el);
    });
    it('should click on the screen coords of the middle of the element', async function () {
      let action = null;
      driver.performActions = (a) => {
        action = a;
      };
      await p.handle(next, driver, 'click', elId);
      action.should.eql([
        {
          type: 'pointer',
          id: 'mouse',
          parameters: {pointerType: 'touch'},
          actions: [
            {type: 'pointerMove', x: 24, y: 40, duration: 0},
            {type: 'pointerDown', button: 0},
            {type: 'pause', duration: 125},
            {type: 'pointerUp', button: 0},
          ],
        },
      ]);
    });
    it('should always say the element is displayed', async function () {
      await p.handle(next, driver, 'elementDisplayed', elId).should.eventually.be.true;
    });
    it('should return the matched region size', async function () {
      await p.handle(next, driver, 'getSize', elId).should.eventually.eql({
        width: 48,
        height: 48,
      });
    });
    it('should return the matched region location', async function () {
      await p.handle(next, driver, 'getLocation', elId).should.eventually.eql({
        x: 0,
        y: 16,
      });
    });
    it('should return the region rect', async function () {
      await p.handle(next, driver, 'getElementRect', elId).should.eventually.eql({
        x: 0,
        y: 16,
        height: 48,
        width: 48,
      });
    });
    it('should return the match score as the score attr', async function () {
      await p.handle(next, driver, 'getAttribute', 'score', elId).should.eventually.be.above(0.7);
    });
    it('should return the match visualization as the visual attr', async function () {
      driver.settings = {
        getSettings: () => ({
          getMatchedImageResult: true,
        }),
      };
      const el = await p.findElement(next, driver, IMAGE_STRATEGY, TEST_IMG_2_PART_B64);
      elId = util.unwrapElement(el);
      await p
        .handle(next, driver, 'getAttribute', 'visual', elId)
        .should.eventually.include('iVBOR');
    });
    it('should not allow any other attrs', async function () {
      await p
        .handle(next, driver, 'getAttribute', 'rando', elId)
        .should.eventually.be.rejectedWith(/not yet/i);
    });
  });
});
