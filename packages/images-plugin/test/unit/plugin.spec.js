import {ImageElementPlugin, IMAGE_STRATEGY} from '../../lib/plugin';
import {MATCH_FEATURES_MODE, GET_SIMILARITY_MODE, MATCH_TEMPLATE_MODE} from '../../lib/compare';
import BaseDriver from 'appium/driver';
import {W3C_ELEMENT_KEY} from '../../lib/finder';
import {TEST_IMG_1_B64, TEST_IMG_2_B64, TEST_IMG_2_PART_B64} from '../fixtures';

describe('ImageElementPlugin#handle', function () {
  const next = () => {};
  const driver = new BaseDriver();
  const p = new ImageElementPlugin();
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
        TEST_IMG_1_B64,
        TEST_IMG_2_B64,
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
        .should.be.rejectedWith(/Image comparison mode "some mode" is invalid/i);
    });
  });

  describe('findElement(s)', function () {
    driver.settings = {getSettings: () => ({})};
    driver.isW3CProtocol = () => true;
    driver.getScreenshot = () => TEST_IMG_2_B64;
    driver.getWindowSize = () => ({width: 64, height: 64});
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
      el[W3C_ELEMENT_KEY].should.include('appium-image-element');
    });
    it('should find image elements inside a screenshot', async function () {
      const els = await p.findElements(next, driver, IMAGE_STRATEGY, TEST_IMG_2_PART_B64);
      els.should.have.length(1);
      els[0][W3C_ELEMENT_KEY].should.include('appium-image-element');
    });
  });

  describe('Element interactions', function () {
    let elId;
    before(async function () {
      driver.settings = {getSettings: () => ({})};
      driver.isW3CProtocol = () => true;
      driver.getScreenshot = () => TEST_IMG_2_B64;
      driver.getWindowSize = () => ({width: 64, height: 64});
      const el = await p.findElement(next, driver, IMAGE_STRATEGY, TEST_IMG_2_PART_B64);
      elId = el[W3C_ELEMENT_KEY];
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
      elId = el[W3C_ELEMENT_KEY];
      await p
        .handle(next, driver, 'getAttribute', 'visual', elId)
        .should.eventually.include('iVBOR');
    });
    it('should not allow any other attrs', async function () {
      await p
        .handle(next, driver, 'getAttribute', 'rando', elId)
        .should.be.rejectedWith(/not yet/i);
    });
  });
});
