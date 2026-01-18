import _ from 'lodash';
import {util} from 'appium/support';
import {BaseDriver} from 'appium/driver';
import {ImageElementPlugin} from '../../lib/plugin';
import {IMAGE_STRATEGY} from '../../lib/constants';
import {ImageElementFinder} from '../../lib/finder';
import {ImageElement} from '../../lib/image-element';
import {createSandbox, type SinonSandbox} from 'sinon';
import {TINY_PNG, TiNY_PNG_BUF, TINY_PNG_DIMS} from '../fixtures/index.cjs';
import sharp from 'sharp';
import * as compareModule from '../../lib/compare';
import type {Constraints} from '@appium/types';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';

use(chaiAsPromised);

const plugin = new ImageElementPlugin('test');

class PluginDriver extends BaseDriver<Constraints> {
  constructor() {
    super({} as any);
  }
  async getWindowRect(): Promise<any> {}
  async getScreenshot(): Promise<any> {}
  findElement(strategy: string, selector: string) {
    return plugin.findElement(async () => {}, this as any, strategy, selector);
  }
  findElements(strategy: string, selector: string) {
    return plugin.findElements(async () => {}, this as any, strategy, selector);
  }
}

describe('finding elements by image', function () {
  let sandbox: SinonSandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('findElement', function () {
    it('should use a different special method to find element by image', async function () {
      const d = new PluginDriver();
      sandbox.stub(plugin.finder, 'findByImage').returns(true as any);
      sandbox.stub(d, 'findElOrElsWithProcessing').returns(false as any);
      await expect(d.findElement(IMAGE_STRATEGY, 'foo')).to.eventually.be.true;
      await expect(d.findElements(IMAGE_STRATEGY, 'foo')).to.eventually.be.true;
    });
    it('should not be able to find image element from any other element', async function () {
      const d = new PluginDriver();
      await expect(
        d.findElementFromElement(IMAGE_STRATEGY, 'foo', 'elId')
      ).to.be.rejectedWith(/Locator Strategy.+is not supported/);
      await expect(
        d.findElementsFromElement(IMAGE_STRATEGY, 'foo', 'elId')
      ).to.be.rejectedWith(/Locator Strategy.+is not supported/);
    });
  });

  describe('findByImage', function () {
    const rect = {x: 10, y: 20, width: 30, height: 40};
    const score = 0.9;
    const size = {width: 100, height: 200};
    const screenshot = Buffer.from('iVBORfoo', 'base64');
    const template = Buffer.from('iVBORbar', 'base64');
    let d: PluginDriver;
    let f: ImageElementFinder;
    let compareStub: sinon.SinonStub;

    function basicStub(driver: PluginDriver, finder: ImageElementFinder) {
      const rectStub = sandbox.stub(driver, 'getWindowRect').returns({
        x: 0,
        y: 0,
        ...size,
      } as any);
      const screenStub = sandbox.stub(finder, 'getScreenshotForImageFind')
        .returns({screenshot} as any);
      return {rectStub, screenStub};
    }

    function basicImgElVerify(imgElProto: any, finder: ImageElementFinder) {
      const imgElId = util.unwrapElement(imgElProto);
      const imgEl = finder.getImageElement(imgElId);
      expect(imgEl).to.be.instanceOf(ImageElement);
      expect(imgEl!.rect).to.eql(rect);
      expect(imgEl!.score).to.eql(score);
      return imgEl;
    }

    beforeEach(function () {
      d = new PluginDriver();
      f = new ImageElementFinder();
      compareStub = sandbox.stub(compareModule, 'compareImages');
      compareStub.resolves({rect, score});
      basicStub(d, f);
    });

    it('should find an image element happypath', async function () {
      const imgElProto = await f.findByImage(template, d as any, {multiple: false});
      basicImgElVerify(imgElProto, f);
    });
    it('should find image elements happypath', async function () {
      compareStub.resolves([{rect, score}]);
      const els = await f.findByImage(template, d as any, {multiple: true});
      expect(els).to.have.length(1);
      basicImgElVerify(els[0], f);
    });
    it('should fail if driver does not support getWindowRect', async function () {
      (d as any).getWindowRect = null;
      await expect(
        f.findByImage(template, d as any, {multiple: false})
      ).to.eventually.be.rejectedWith(/driver does not support/);
    });
    it('should fix template size if requested', async function () {
      const newTemplate = 'iVBORbaz';
      const newTemplateBuf = Buffer.from(newTemplate, 'base64');
      await (d as any).settings.update({fixImageTemplateSize: true});
      sandbox.stub(f, 'ensureTemplateSize').resolves(newTemplateBuf);
      const imgElProto = await f.findByImage(template, d as any, {multiple: false});
      const imgEl = basicImgElVerify(imgElProto, f);
      expect(imgEl!.originalImage).to.eql(newTemplate);
      expect(_.last(compareStub.args)![2]).to.eql(newTemplateBuf);
    });

    it('should fix template size scale if requested', async function () {
      const newTemplate = 'iVBORbaz';
      const newTemplateBuf = Buffer.from(newTemplate, 'base64');
      await (d as any).settings.update({fixImageTemplateScale: true});
      sandbox.stub(f, 'fixImageTemplateScale').resolves(newTemplateBuf);
      const imgElProto = await f.findByImage(template, d as any, {multiple: false});
      const imgEl = basicImgElVerify(imgElProto, f);
      expect(imgEl!.originalImage).to.eql(newTemplate);
      expect(_.last(compareStub.args)![2]).to.eql(newTemplateBuf);
    });
    it('should not fix template size scale if it is not requested', async function () {
      await (d as any).settings.update({});
      // fixImageTemplateScale is always called, but should return the original template
      // when scaling is not requested. We verify this by checking the compareImages call
      // receives the original template, not a modified one.
      const imgElProto = await f.findByImage(template, d as any, {multiple: false});
      basicImgElVerify(imgElProto, f);
      // The template passed to compareImages should be the original (or same buffer reference)
      // when fixImageTemplateScale is not requested
      expect(compareStub.called).to.be.true;
      const lastCallArgs = _.last(compareStub.args);
      expect(lastCallArgs![2]).to.eql(template);
    });

    it('should throw an error if template match fails', async function () {
      compareStub.rejects(new Error('Cannot find any occurrences'));
      await expect(
        f.findByImage(template, d as any, {multiple: false})
      ).to.be.rejectedWith(/element could not be located/);
    });
    it('should return empty array for multiple elements if template match fails', async function () {
      compareStub.rejects(new Error('Cannot find any occurrences'));
      await expect(f.findByImage(template, d as any, {multiple: true})).to.eventually.eql([]);
    });
    it('should respect implicit wait', async function () {
      (d as any).setImplicitWait(10);
      compareStub.resetHistory();
      compareStub.returns({rect, score});
      compareStub.onFirstCall().throws(new Error('Cannot find any occurrences'));
      const imgElProto = await f.findByImage(template, d as any, {multiple: false});
      basicImgElVerify(imgElProto, f);
      expect(compareStub.calledTwice).to.be.true;
    });
    it('should not add element to cache and return it directly when checking staleness', async function () {
      const imgEl = await f.findByImage(template, d as any, {
        multiple: false,
        shouldCheckStaleness: true,
      }) as ImageElement;
      expect(imgEl).to.be.instanceOf(ImageElement);
      expect(_.isNil(f.getImageElement(imgEl.id))).to.be.true;
      expect(imgEl.rect).to.eql(rect);
    });
  });

  describe('fixImageTemplateScale', function () {
    let f: ImageElementFinder;
    const basicTemplate = 'iVBORbaz';
    const basicTemplateBuf = Buffer.from(basicTemplate, 'base64');


    beforeEach(function () {
      f = new ImageElementFinder();
    });

    it('should not fix template size scale if no scale value', async function () {
      await expect(
        f.fixImageTemplateScale(basicTemplateBuf, {fixImageTemplateScale: true})
      ).to.eventually.eql(basicTemplateBuf);
    });

    it('should not fix template size scale if it is null', async function () {
      await expect(f.fixImageTemplateScale(basicTemplateBuf, null as any)).to.eventually.eql(basicTemplateBuf);
    });

    it('should not fix template size scale if it is not number', async function () {
      await expect(
        f.fixImageTemplateScale(basicTemplateBuf, 'wrong-scale' as any)
      ).to.eventually.eql(basicTemplateBuf);
    });

    it('should fix template size scale', async function () {
      await expect(
        f.fixImageTemplateScale(TiNY_PNG_BUF, {
          fixImageTemplateScale: true,
          xScale: 1.5,
          yScale: 1.5,
        })
      ).to.eventually.not.eql(TiNY_PNG_BUF);
    });

    it('should not fix template size scale because of fixImageTemplateScale being false', async function () {
      await expect(
        f.fixImageTemplateScale(TiNY_PNG_BUF, {
          fixImageTemplateScale: false,
          xScale: 1.5,
          yScale: 1.5,
        })
      ).to.eventually.eql(TiNY_PNG_BUF);
    });

    it('should fix template size scale with default scale', async function () {
      await expect(
        f.fixImageTemplateScale(TiNY_PNG_BUF, {
          defaultImageTemplateScale: 4.0,
        })
      ).to.eventually.not.eql(TiNY_PNG_BUF);
    });

    it('should fix template size scale with default scale and image scale', async function () {
      await expect(
        f.fixImageTemplateScale(TiNY_PNG_BUF, {
          defaultImageTemplateScale: 4.0,
          fixImageTemplateScale: true,
          xScale: 1.5,
          yScale: 1.5,
        })
      ).to.eventually.not.eql(TiNY_PNG_BUF);
    });

    it('should not fix template size scale with default scale and image scale', async function () {
      await expect(
        f.fixImageTemplateScale(TiNY_PNG_BUF, {
          defaultImageTemplateScale: 4.0,
          fixImageTemplateScale: false,
          xScale: 1.5,
          yScale: 1.5,
        })
      ).to.eventually.not.eql(TiNY_PNG_BUF);
    });

    it('should not fix template size scale because of ignoreDefaultImageTemplateScale', async function () {
      await expect(
        f.fixImageTemplateScale(TiNY_PNG_BUF, {
          defaultImageTemplateScale: 4.0,
          ignoreDefaultImageTemplateScale: true,
        })
      ).to.eventually.eql(TiNY_PNG_BUF);
    });

    it('should ignore defaultImageTemplateScale to fix template size scale because of ignoreDefaultImageTemplateScale', async function () {
      await expect(
        f.fixImageTemplateScale(TiNY_PNG_BUF, {
          defaultImageTemplateScale: 4.0,
          ignoreDefaultImageTemplateScale: true,
          fixImageTemplateScale: true,
          xScale: 1.5,
          yScale: 1.5,
        })
      ).to.eventually.not.eql(TiNY_PNG_BUF);
    });
  });

  describe('ensureTemplateSize', function () {
    const f = new ImageElementFinder();

    it('should not resize the template if it is smaller than the screen', async function () {
      const [width, height] = TINY_PNG_DIMS.map((n) => n * 2);
      await expect(f.ensureTemplateSize(TiNY_PNG_BUF, {width, height})).to.eventually.eql(TiNY_PNG_BUF);
    });
    it('should not resize the template if it is the same size as the screen', async function () {
      const [width, height] = TINY_PNG_DIMS;
      await expect(f.ensureTemplateSize(TiNY_PNG_BUF, {width, height})).to.eventually.eql(TiNY_PNG_BUF);
    });
    it('should resize the template if it is bigger than the screen', async function () {
      const [width, height] = TINY_PNG_DIMS.map((n) => n / 2);
      const newTemplateBuf = await f.ensureTemplateSize(TiNY_PNG_BUF, {width, height});
      expect(newTemplateBuf).to.not.eql(TiNY_PNG_BUF);
      expect(newTemplateBuf.length).to.be.below(TiNY_PNG_BUF.length);
    });
  });

  describe('getScreenshotForImageFind', function () {
    let d: PluginDriver;
    let f: ImageElementFinder;

    beforeEach(function () {
      d = new PluginDriver();
      f = new ImageElementFinder();
      sandbox.stub(d, 'getScreenshot').resolves(TINY_PNG);
    });

    it('should fail if driver does not support getScreenshot', async function () {
      await expect(
        new ImageElementFinder()
          .getScreenshotForImageFind(new BaseDriver<Constraints>({} as any) as any, {width: 100, height: 100})
      ).to.eventually.be.rejectedWith(/driver does not support/);
    });
    it('should not adjust or verify screenshot if asked not to by settings', async function () {
      await (d as any).settings.update({fixImageFindScreenshotDims: false});
      const [width, height] = TINY_PNG_DIMS.map((n) => n + 1);
      const {screenshot, scale} = await f.getScreenshotForImageFind(d as any, {width, height} as any);
      expect(screenshot).to.eql(TiNY_PNG_BUF);
      expect(scale).to.equal(undefined);
    });
    it('should return screenshot without adjustment if it matches screen size', async function () {
      const [width, height] = TINY_PNG_DIMS;
      const {screenshot, scale} = await f.getScreenshotForImageFind(d as any, {width, height} as any);
      expect(screenshot).to.eql(TiNY_PNG_BUF);
      expect(scale).to.equal(undefined);
    });
    it('should return scaled screenshot with same aspect ratio if matching screen aspect ratio', async function () {
      const [width, height] = TINY_PNG_DIMS.map((n) => n * 1.5);
      const {screenshot, scale} = await f.getScreenshotForImageFind(d as any, {width, height} as any);
      expect(screenshot).to.not.eql(TiNY_PNG_BUF);
      const screenshotObj = sharp(screenshot);
      const {width: screenWidth, height: screenHeight} = await screenshotObj.metadata();
      expect(screenWidth).to.eql(width);
      expect(screenHeight).to.eql(height);
      expect(scale).to.eql({xScale: 1.5, yScale: 1.5});
    });
    it('should return scaled screenshot with different aspect ratio if not matching screen aspect ratio', async function () {
      // try first with portrait screen, screen = 8 x 12
      let [width, height] = [TINY_PNG_DIMS[0] * 2, TINY_PNG_DIMS[1] * 3];
      let expectedScale = {xScale: 2.67, yScale: 4};

      const {screenshot, scale} = await f.getScreenshotForImageFind(d as any, {width, height} as any);
      expect(screenshot).to.not.eql(TiNY_PNG_BUF);
      let screenshotObj = sharp(screenshot);
      let {width: screenWidth, height: screenHeight} = await screenshotObj.metadata();
      expect(screenWidth).to.eql(width);
      expect(screenHeight).to.eql(height);
      expect(scale!.xScale.toFixed(2)).to.eql(expectedScale.xScale.toString());
      expect(scale!.yScale).to.eql(expectedScale.yScale);

      // then with landscape screen, screen = 12 x 8
      [width, height] = [TINY_PNG_DIMS[0] * 3, TINY_PNG_DIMS[1] * 2];
      expectedScale = {xScale: 4, yScale: 2.67};

      const {screenshot: newScreen, scale: newScale} = await f.getScreenshotForImageFind(d as any, {width, height} as any);
      expect(newScreen).to.not.eql(TiNY_PNG_BUF);
      screenshotObj = sharp(newScreen);
      ({width: screenWidth, height: screenHeight} = await screenshotObj.metadata());
      expect(screenWidth).to.eql(width);
      expect(screenHeight).to.eql(height);
      expect(newScale!.xScale).to.eql(expectedScale.xScale);
      expect(newScale!.yScale.toFixed(2)).to.eql(expectedScale.yScale.toString());
    });

    it('should return scaled screenshot with different aspect ratio if not matching screen aspect ratio with fixImageTemplateScale', async function () {
      // try first with portrait screen, screen = 8 x 12
      let [width, height] = [TINY_PNG_DIMS[0] * 2, TINY_PNG_DIMS[1] * 3];
      let expectedScale = {xScale: 2.67, yScale: 4};

      const {screenshot, scale} = await f.getScreenshotForImageFind(d as any, {width, height} as any);
      expect(screenshot).to.not.eql(TiNY_PNG_BUF);
      let screenshotObj = sharp(screenshot);
      let {width: screenWidth, height: screenHeight} = await screenshotObj.metadata();
      expect(screenWidth).to.eql(width);
      expect(screenHeight).to.eql(height);
      expect(scale!.xScale.toFixed(2)).to.eql(expectedScale.xScale.toString());
      expect(scale!.yScale).to.eql(expectedScale.yScale);
      // 8 x 12 stretched TINY_PNG
      await expect(
        f.fixImageTemplateScale(screenshot, {fixImageTemplateScale: true, xScale: scale!.xScale, yScale: scale!.yScale})
      ).to.eventually.not.eql(TiNY_PNG_BUF);

      // then with landscape screen, screen = 12 x 8
      [width, height] = [TINY_PNG_DIMS[0] * 3, TINY_PNG_DIMS[1] * 2];
      expectedScale = {xScale: 4, yScale: 2.67};

      const {screenshot: newScreen, scale: newScale} = await f.getScreenshotForImageFind(d as any, {width, height} as any);
      expect(newScreen).to.not.eql(TiNY_PNG_BUF);
      screenshotObj = sharp(newScreen);
      ({width: screenWidth, height: screenHeight} = await screenshotObj.metadata());
      expect(screenWidth).to.eql(width);
      expect(screenHeight).to.eql(height);
      expect(newScale!.xScale).to.eql(expectedScale.xScale);
      expect(newScale!.yScale.toFixed(2)).to.eql(expectedScale.yScale.toString());
      // 12 x 8 stretched TINY_PNG
      await expect(
        f.fixImageTemplateScale(newScreen, {fixImageTemplateScale: true, xScale: newScale!.xScale, yScale: newScale!.yScale})
      ).to.eventually.not.eql(TiNY_PNG_BUF);
    });
  });
});
