import _ from 'lodash';
import {util} from 'appium/support';
import {BaseDriver} from 'appium/driver';
import {ImageElementPlugin} from '../../lib/plugin';
import {IMAGE_STRATEGY} from '../../lib/constants';
import ImageElementFinder from '../../lib/finder';
import {ImageElement} from '../../lib/image-element';
import sinon from 'sinon';
import {TINY_PNG, TiNY_PNG_BUF, TINY_PNG_DIMS} from '../fixtures';
import sharp from 'sharp';

const compareModule = require('../../lib/compare');

const plugin = new ImageElementPlugin();

class PluginDriver extends BaseDriver {
  async getWindowRect() {}
  async getScreenshot() {}
  findElement(strategy, selector) {
    return plugin.findElement(_.noop, this, strategy, selector);
  }
  findElements(strategy, selector) {
    return plugin.findElements(_.noop, this, strategy, selector);
  }
}

describe('finding elements by image', function () {
  let sandbox;
  let should;

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    should = chai.should();
  });

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('findElement', function () {
    it('should use a different special method to find element by image', async function () {
      const d = new PluginDriver();
      sandbox.stub(plugin.finder, 'findByImage').returns(true);
      sandbox.stub(d, 'findElOrElsWithProcessing').returns(false);
      await d.findElement(IMAGE_STRATEGY, 'foo').should.eventually.be.true;
      await d.findElements(IMAGE_STRATEGY, 'foo').should.eventually.be.true;
    });
    it('should not be able to find image element from any other element', async function () {
      const d = new PluginDriver();
      await d
        .findElementFromElement(IMAGE_STRATEGY, 'foo', 'elId')
        .should.be.rejectedWith(/Locator Strategy.+is not supported/);
      await d
        .findElementsFromElement(IMAGE_STRATEGY, 'foo', 'elId')
        .should.be.rejectedWith(/Locator Strategy.+is not supported/);
    });
  });

  describe('findByImage', function () {
    const rect = {x: 10, y: 20, width: 30, height: 40};
    const score = 0.9;
    const size = {width: 100, height: 200};
    const screenshot = Buffer.from('iVBORfoo', 'base64');
    const template = Buffer.from('iVBORbar', 'base64');
    /** @type {PluginDriver} */
    let d;
    /** @type {ImageElementFinder} */
    let f;
    /** @type {import('sinon').SinonStubbedMember<import('../../lib/compare').compareImages>} */
    let compareStub;

    function basicStub(driver, finder) {
      const rectStub = sandbox.stub(driver, 'getWindowRect').returns({
        x: 0,
        y: 0,
        ...size,
      });
      const screenStub = sandbox.stub(finder, 'getScreenshotForImageFind')
        .returns({screenshot});
      return {rectStub, screenStub};
    }

    function basicImgElVerify(imgElProto, finder) {
      const imgElId = util.unwrapElement(imgElProto);
      const imgEl = finder.getImageElement(imgElId);
      (imgEl instanceof ImageElement).should.be.true;
      imgEl.rect.should.eql(rect);
      imgEl.score.should.eql(score);
      return imgEl;
    }

    beforeEach(function () {
      d = new PluginDriver();
      f = new ImageElementFinder();
      compareStub = sandbox;
      compareStub = sandbox.stub(compareModule, 'compareImages');
      compareStub.resolves({rect, score});
      basicStub(d, f);
    });

    it('should find an image element happypath', async function () {
      const imgElProto = await f.findByImage(template, d, {multiple: false});
      basicImgElVerify(imgElProto, f);
    });
    it('should find image elements happypath', async function () {
      compareStub.resolves([{rect, score}]);
      const els = await f.findByImage(template, d, {multiple: true});
      els.should.have.length(1);
      basicImgElVerify(els[0], f);
    });
    it('should fail if driver does not support getWindowRect', async function () {
      d.getWindowRect = null;
      await f
        .findByImage(template, d, {multiple: false})
        .should.eventually.be.rejectedWith(/driver does not support/);
    });
    it('should fix template size if requested', async function () {
      const newTemplate = 'iVBORbaz';
      const newTemplateBuf = Buffer.from(newTemplate, 'base64');
      await d.settings.update({fixImageTemplateSize: true});
      sandbox.stub(f, 'ensureTemplateSize').returns(newTemplateBuf);
      const imgElProto = await f.findByImage(template, d, {multiple: false});
      const imgEl = basicImgElVerify(imgElProto, f);
      imgEl.originalImage.should.eql(newTemplate);
      _.last(compareStub.args)[2].should.eql(newTemplateBuf);
    });

    it('should fix template size scale if requested', async function () {
      const newTemplate = 'iVBORbaz';
      const newTemplateBuf = Buffer.from(newTemplate, 'base64');
      await d.settings.update({fixImageTemplateScale: true});
      sandbox.stub(f, 'fixImageTemplateScale').returns(newTemplateBuf);
      const imgElProto = await f.findByImage(template, d, {multiple: false});
      const imgEl = basicImgElVerify(imgElProto, f);
      imgEl.originalImage.should.eql(newTemplate);
      _.last(compareStub.args)[2].should.eql(newTemplateBuf);
    });
    it('should not fix template size scale if it is not requested', async function () {
      const newTemplate = 'iVBORbaz';
      const newTemplateBuf = Buffer.from(newTemplate, 'base64');
      await d.settings.update({});
      sandbox.stub(f, 'fixImageTemplateScale').returns(newTemplateBuf);
      f.fixImageTemplateScale.callCount.should.eql(0);
    });

    it('should throw an error if template match fails', async function () {
      compareStub.rejects(new Error('Cannot find any occurrences'));
      await f
        .findByImage(template, d, {multiple: false})
        .should.be.rejectedWith(/element could not be located/);
    });
    it('should return empty array for multiple elements if template match fails', async function () {
      compareStub.rejects(new Error('Cannot find any occurrences'));
      await f.findByImage(template, d, {multiple: true}).should.eventually.eql([]);
    });
    it('should respect implicit wait', async function () {
      d.setImplicitWait(10);
      compareStub.resetHistory();
      compareStub.returns({rect, score});
      compareStub.onFirstCall().throws(new Error('Cannot find any occurrences'));
      const imgElProto = await f.findByImage(template, d, {multiple: false});
      basicImgElVerify(imgElProto, f);
      compareStub.calledTwice.should.be.true;
    });
    it('should not add element to cache and return it directly when checking staleness', async function () {
      const imgEl = await f.findByImage(template, d, {
        multiple: false,
        shouldCheckStaleness: true,
      });
      (imgEl instanceof ImageElement).should.be.true;
      _.isNil(f.getImageElement(imgEl.id)).should.be.true;
      imgEl.rect.should.eql(rect);
    });
  });

  describe('fixImageTemplateScale', function () {
    let f;
    const basicTemplate = 'iVBORbaz';
    const basicTemplateBuf = Buffer.from(basicTemplate, 'base64');


    beforeEach(function () {
      f = new ImageElementFinder();
    });

    it('should not fix template size scale if no scale value', async function () {
      await f
        .fixImageTemplateScale(basicTemplateBuf, {fixImageTemplateScale: true})
        .should.eventually.eql(basicTemplateBuf);
    });

    it('should not fix template size scale if it is null', async function () {
      await f.fixImageTemplateScale(basicTemplateBuf, null).should.eventually.eql(basicTemplateBuf);
    });

    it('should not fix template size scale if it is not number', async function () {
      await f
        .fixImageTemplateScale(basicTemplateBuf, 'wrong-scale')
        .should.eventually.eql(basicTemplateBuf);
    });

    it('should fix template size scale', async function () {
      await f
        .fixImageTemplateScale(TiNY_PNG_BUF, {
          fixImageTemplateScale: true,
          xScale: 1.5,
          yScale: 1.5,
        })
        .should.eventually.not.eql(TiNY_PNG_BUF);
    });

    it('should not fix template size scale because of fixImageTemplateScale being false', async function () {
      await f
        .fixImageTemplateScale(TiNY_PNG_BUF, {
          fixImageTemplateScale: false,
          xScale: 1.5,
          yScale: 1.5,
        })
        .should.eventually.eql(TiNY_PNG_BUF);
    });

    it('should fix template size scale with default scale', async function () {
      await f
        .fixImageTemplateScale(TiNY_PNG_BUF, {
          defaultImageTemplateScale: 4.0,
        })
        .should.eventually.not.eql(TiNY_PNG_BUF);
    });

    it('should fix template size scale with default scale and image scale', async function () {
      await f
        .fixImageTemplateScale(TiNY_PNG_BUF, {
          defaultImageTemplateScale: 4.0,
          fixImageTemplateScale: true,
          xScale: 1.5,
          yScale: 1.5,
        })
        .should.eventually.not.eql(TiNY_PNG_BUF);
    });

    it('should not fix template size scale with default scale and image scale', async function () {
      await f
        .fixImageTemplateScale(TiNY_PNG_BUF, {
          defaultImageTemplateScale: 4.0,
          fixImageTemplateScale: false,
          xScale: 1.5,
          yScale: 1.5,
        })
        .should.eventually.not.eql(TiNY_PNG_BUF);
    });

    it('should not fix template size scale because of ignoreDefaultImageTemplateScale', async function () {
      await f
        .fixImageTemplateScale(TiNY_PNG_BUF, {
          defaultImageTemplateScale: 4.0,
          ignoreDefaultImageTemplateScale: true,
        })
        .should.eventually.eql(TiNY_PNG_BUF);
    });

    it('should ignore defaultImageTemplateScale to fix template size scale because of ignoreDefaultImageTemplateScale', async function () {
      await f
        .fixImageTemplateScale(TiNY_PNG_BUF, {
          defaultImageTemplateScale: 4.0,
          ignoreDefaultImageTemplateScale: true,
          fixImageTemplateScale: true,
          xScale: 1.5,
          yScale: 1.5,
        })
        .should.eventually.not.eql(TiNY_PNG_BUF);
    });
  });

  describe('ensureTemplateSize', function () {
    const f = new ImageElementFinder();

    it('should not resize the template if it is smaller than the screen', async function () {
      const [width, height] = TINY_PNG_DIMS.map((n) => n * 2);
      await f.ensureTemplateSize(TiNY_PNG_BUF, {width, height}).should.eventually.eql(TiNY_PNG_BUF);
    });
    it('should not resize the template if it is the same size as the screen', async function () {
      const [width, height] = TINY_PNG_DIMS;
      await f.ensureTemplateSize(TiNY_PNG_BUF, {width, height}).should.eventually.eql(TiNY_PNG_BUF);
    });
    it('should resize the template if it is bigger than the screen', async function () {
      const [width, height] = TINY_PNG_DIMS.map((n) => n / 2);
      const newTemplateBuf = await f.ensureTemplateSize(TiNY_PNG_BUF, {width, height});
      newTemplateBuf.should.not.eql(TiNY_PNG_BUF);
      newTemplateBuf.length.should.be.below(TiNY_PNG_BUF.length);
    });
  });

  describe('getScreenshotForImageFind', function () {
    let d;
    let f;

    beforeEach(function () {
      d = new PluginDriver();
      f = new ImageElementFinder();
      sandbox.stub(d, 'getScreenshot').returns(TINY_PNG);
    });

    it('should fail if driver does not support getScreenshot', async function () {
      await new ImageElementFinder()
        .getScreenshotForImageFind(new BaseDriver())
        .should.eventually.be.rejectedWith(/driver does not support/);
    });
    it('should not adjust or verify screenshot if asked not to by settings', async function () {
      await d.settings.update({fixImageFindScreenshotDims: false});
      const [width, height] = TINY_PNG_DIMS.map((n) => n + 1);
      const {screenshot, scale} = await f.getScreenshotForImageFind(d, {width, height});
      screenshot.should.eql(TiNY_PNG_BUF);
      should.equal(scale, undefined);
    });
    it('should return screenshot without adjustment if it matches screen size', async function () {
      const [width, height] = TINY_PNG_DIMS;
      const {screenshot, scale} = await f.getScreenshotForImageFind(d, {width, height});
      screenshot.should.eql(TiNY_PNG_BUF);
      should.equal(scale, undefined);
    });
    it('should return scaled screenshot with same aspect ratio if matching screen aspect ratio', async function () {
      const [width, height] = TINY_PNG_DIMS.map((n) => n * 1.5);
      const {screenshot, scale} = await f.getScreenshotForImageFind(d, {width, height});
      screenshot.should.not.eql(TiNY_PNG_BUF);
      const screenshotObj = sharp(screenshot);
      const {width: screenWidth, height: screenHeight} = await screenshotObj.metadata();
      screenWidth.should.eql(width);
      screenHeight.should.eql(height);
      scale.should.eql({xScale: 1.5, yScale: 1.5});
    });
    it('should return scaled screenshot with different aspect ratio if not matching screen aspect ratio', async function () {
      // try first with portrait screen, screen = 8 x 12
      let [width, height] = [TINY_PNG_DIMS[0] * 2, TINY_PNG_DIMS[1] * 3];
      let expectedScale = {xScale: 2.67, yScale: 4};

      const {screenshot, scale} = await f.getScreenshotForImageFind(d, {width, height});
      screenshot.should.not.eql(TiNY_PNG_BUF);
      let screenshotObj = sharp(screenshot);
      let {width: screenWidth, height: screenHeight} = await screenshotObj.metadata();
      screenWidth.should.eql(width);
      screenHeight.should.eql(height);
      scale.xScale.toFixed(2).should.eql(expectedScale.xScale.toString());
      scale.yScale.should.eql(expectedScale.yScale);

      // then with landscape screen, screen = 12 x 8
      [width, height] = [TINY_PNG_DIMS[0] * 3, TINY_PNG_DIMS[1] * 2];
      expectedScale = {xScale: 4, yScale: 2.67};

      const {screenshot: newScreen, scale: newScale} = await f.getScreenshotForImageFind(d, {width, height});
      newScreen.should.not.eql(TiNY_PNG_BUF);
      screenshotObj = sharp(newScreen);
      ({width: screenWidth, height: screenHeight} = await screenshotObj.metadata());
      screenWidth.should.eql(width);
      screenHeight.should.eql(height);
      newScale.xScale.should.eql(expectedScale.xScale);
      newScale.yScale.toFixed(2).should.eql(expectedScale.yScale.toString());
    });

    it('should return scaled screenshot with different aspect ratio if not matching screen aspect ratio with fixImageTemplateScale', async function () {
      // try first with portrait screen, screen = 8 x 12
      let [width, height] = [TINY_PNG_DIMS[0] * 2, TINY_PNG_DIMS[1] * 3];
      let expectedScale = {xScale: 2.67, yScale: 4};

      const {screenshot, scale} = await f.getScreenshotForImageFind(d, {width, height});
      screenshot.should.not.eql(TiNY_PNG_BUF);
      let screenshotObj = sharp(screenshot);
      let {width: screenWidth, height: screenHeight} = await screenshotObj.metadata();
      screenWidth.should.eql(width);
      screenHeight.should.eql(height);
      scale.xScale.toFixed(2).should.eql(expectedScale.xScale.toString());
      scale.yScale.should.eql(expectedScale.yScale);
      // 8 x 12 stretched TINY_PNG
      await f
        .fixImageTemplateScale(screenshot, {fixImageTemplateScale: true, scale})
        .should.eventually.not.eql(TiNY_PNG_BUF);

      // then with landscape screen, screen = 12 x 8
      [width, height] = [TINY_PNG_DIMS[0] * 3, TINY_PNG_DIMS[1] * 2];
      expectedScale = {xScale: 4, yScale: 2.67};

      const {screenshot: newScreen, scale: newScale} = await f.getScreenshotForImageFind(d, {width, height});
      newScreen.should.not.eql(TiNY_PNG_BUF);
      screenshotObj = sharp(newScreen);
      ({width: screenWidth, height: screenHeight} = await screenshotObj.metadata());
      screenWidth.should.eql(width);
      screenHeight.should.eql(height);
      newScale.xScale.should.eql(expectedScale.xScale);
      newScale.yScale.toFixed(2).should.eql(expectedScale.yScale.toString());
      // 12 x 8 stretched TINY_PNG
      await f
        .fixImageTemplateScale(newScreen, {fixImageTemplateScale: true, scale})
        .should.eventually.not.eql(TiNY_PNG_BUF);
    });
  });
});
