import assert from 'node:assert/strict';
import {afterEach, beforeEach, describe, it, mock} from 'node:test';

import {NoImageOccurrencesError} from '@appium/opencv';
import type {Constraints, Element} from '@appium/types';
import {BaseDriver, errors} from 'appium/driver.js';
import {util} from 'appium/support.js';
import sharp from 'sharp';
import {createSandbox, type SinonSandbox} from 'sinon';

import {IMAGE_STRATEGY} from '../../lib/constants.js';
import type {ImageElementFinder as TImageElementFinder} from '../../lib/finder.js';
import {ImageElement} from '../../lib/image-element.js';

// finder.js and plugin.js both statically import compareImages from compare.js;
// the mock must be registered before they are loaded, since ESM bindings are
// resolved at module-evaluation time and cannot be re-stubbed afterwards.
const compareStub: sinon.SinonStub = createSandbox().stub();
mock.module('../../lib/compare.js', {namedExports: {compareImages: compareStub}});
const {ImageElementFinder} = await import('../../lib/finder.js');
const {ImageElementPlugin} = await import('../../lib/plugin.js');

const plugin = new ImageElementPlugin('test');
const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9' +
  'iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iI' +
  'Hg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQwIDc5LjE2MDQ1MSwgMjAxNy8wNS8wNi0wMTowODoyMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8' +
  'vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL' +
  '3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHl' +
  'wZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6N0NDM' +
  'DM4MDM4N0U2MTFFOEEzMzhGMTRFNUUwNzIwNUIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6N0NDMDM4MDQ4N0U2MTFFOEEzMzhGMTRFNUUwNzIwNUIiPiA8eG1wTU06RGV' +
  'yaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo3Q0MwMzgwMTg3RTYxMUU4QTMzOEYxNEU1RTA3MjA1QiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo3Q0MwM' +
  'zgwMjg3RTYxMUU4QTMzOEYxNEU1RTA3MjA1QiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PpdvJjQAAAA' +
  'lSURBVHjaJInBEQAACIKw/Xe2Ul5wYBtwmJqkk4+zfvUQVoABAEg0EfrZwc0hAAAAAElFTkSuQmCC';
const TINY_PNG_BUF = Buffer.from(TINY_PNG, 'base64');
const TINY_PNG_DIMS = [4, 4];

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
      assert.strictEqual(await d.findElement(IMAGE_STRATEGY, 'foo'), true);
      assert.strictEqual(await d.findElements(IMAGE_STRATEGY, 'foo'), true);
    });
    it('should not be able to find image element from any other element', async function () {
      const d = new PluginDriver();
      await assert.rejects(
        d.findElementFromElement(IMAGE_STRATEGY, 'foo', 'elId'),
        /Locator Strategy.+is not supported/,
      );
      await assert.rejects(
        d.findElementsFromElement(IMAGE_STRATEGY, 'foo', 'elId'),
        /Locator Strategy.+is not supported/,
      );
    });
  });

  describe('findByImage', function () {
    const rect = {x: 10, y: 20, width: 30, height: 40};
    const score = 0.9;
    const size = {width: 100, height: 200};
    const screenshot = TINY_PNG_BUF;
    const template = Buffer.from('iVBORbar', 'base64');
    let d: PluginDriver;
    let f: TImageElementFinder;

    function basicStub(driver: PluginDriver, finder: TImageElementFinder) {
      const rectStub = sandbox.stub(driver, 'getWindowRect').returns({
        x: 0,
        y: 0,
        ...size,
      } as any);
      const screenStub = sandbox.stub(finder, 'getScreenshotForImageFind').returns({screenshot} as any);
      return {rectStub, screenStub};
    }

    function useScreenshot(image: Buffer) {
      (f.getScreenshotForImageFind as any).callsFake(function (this: TImageElementFinder, ...args: any[]) {
        return (ImageElementFinder.prototype.getScreenshotForImageFind as any).apply(this, args);
      });
      sandbox.stub(d, 'getScreenshot').resolves(image.toString('base64'));
    }

    async function screenImage() {
      return await sharp({
        create: {width: size.width, height: size.height, channels: 3, background: '#fff'},
      })
        .png()
        .toBuffer();
    }

    function basicImgElVerify(imgElProto: any, finder: TImageElementFinder) {
      const imgElId = util.unwrapElement(imgElProto);
      const imgEl = finder.getImageElement(imgElId);
      assert.ok(imgEl instanceof ImageElement);
      assert.deepStrictEqual(imgEl!.rect, rect);
      assert.strictEqual(imgEl!.score, score);
      return imgEl;
    }

    beforeEach(function () {
      d = new PluginDriver();
      f = new ImageElementFinder();
      compareStub.reset();
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
      assert.ok(Array.isArray(els));
      assert.strictEqual(els.length, 1);
      basicImgElVerify((els as unknown as ImageElement[])[0], f);
    });
    it('should return every matched image element', async function () {
      const rects = [rect, {...rect, x: 50}, {...rect, y: 100}];
      compareStub.resolves(rects.map((r) => ({rect: r, score})));
      const els = (await f.findByImage(template, d as any, {multiple: true})) as Element[];
      assert.deepStrictEqual(
        els.map((el) => f.getImageElement(util.unwrapElement(el))!.rect),
        rects,
      );
    });
    it('should find an image element inside the container when a better match is outside of it', async function () {
      useScreenshot(await screenImage());
      const containerRect = {x: 0, y: 100, width: 100, height: 100};
      compareStub.callsFake(async (...args: any[]) => {
        const {height} = await sharp(args[1]).metadata();
        return height === size.height ? {rect, score: 0.99} : {rect: {...rect, x: 40}, score: 0.8};
      });
      const el = (await f.findByImage(template, d as any, {multiple: false, containerRect})) as Element;
      assert.deepStrictEqual(f.getImageElement(util.unwrapElement(el))!.rect, {...rect, x: 40, y: rect.y + 100});
    });
    it('should return every matched image element inside the container', async function () {
      useScreenshot(await screenImage());
      const containerRect = {x: 0, y: 0, width: 100, height: 100};
      const inside = [rect, {...rect, x: 50}];
      compareStub.callsFake(async (...args: any[]) => {
        const {width, height} = await sharp(args[1]).metadata();
        assert.deepStrictEqual({width, height}, {width: containerRect.width, height: containerRect.height});
        return inside.map((r) => ({rect: r, score}));
      });
      const els = (await f.findByImage(template, d as any, {
        multiple: true,
        containerRect,
      })) as Element[];
      assert.deepStrictEqual(
        els.map((el) => f.getImageElement(util.unwrapElement(el))!.rect),
        inside,
      );
    });
    it('should shift every match by the container crop', async function () {
      useScreenshot(await screenImage());
      const containerRect = {x: 10.6, y: 20.2, width: 50.6, height: 40.4};
      const crop = {x: 10, y: 20, width: 52, height: 41};
      const locals = [
        {x: 0, y: 0, width: 3, height: 4},
        {x: 4, y: 5, width: 3, height: 4},
      ];
      compareStub.callsFake(async (...args: any[]) => {
        const {width, height} = await sharp(args[1]).metadata();
        assert.deepStrictEqual({width, height}, {width: crop.width, height: crop.height});
        return locals.map((r) => ({rect: r, score}));
      });
      const els = (await f.findByImage(template, d as any, {multiple: true, containerRect})) as Element[];
      assert.deepStrictEqual(
        els.map((el) => f.getImageElement(util.unwrapElement(el))!.rect),
        locals.map((r) => ({...r, x: r.x + crop.x, y: r.y + crop.y})),
      );
    });
    it('should keep the matched image from the container crop', async function () {
      useScreenshot(await screenImage());
      await (d as any).settings.update({getMatchedImageResult: true});
      const visual = Buffer.from('crop-match').toString('base64');
      const containerRect = {x: 0, y: 100, width: 100, height: 100};
      compareStub.callsFake(async (...args: any[]) => {
        const {height} = await sharp(args[1]).metadata();
        assert.strictEqual(height, containerRect.height);
        return {rect: {...rect, x: 0}, score, visualization: visual};
      });
      const el = (await f.findByImage(template, d as any, {multiple: false, containerRect})) as Element;
      assert.strictEqual(f.getImageElement(util.unwrapElement(el))!.matchedImage, visual);
    });
    it('should find nothing when the container is outside the screenshot', async function () {
      useScreenshot(await screenImage());
      compareStub.resetHistory();
      await assert.rejects(
        f.findByImage(template, d as any, {
          multiple: false,
          containerRect: {x: 300, y: 0, width: 10, height: 10},
        }),
        /element could not be located/,
      );
      assert.strictEqual(compareStub.called, false);
    });
    it('should return no elements when the container is outside the screenshot', async function () {
      useScreenshot(await screenImage());
      compareStub.resetHistory();
      assert.deepStrictEqual(
        await f.findByImage(template, d as any, {
          multiple: true,
          containerRect: {x: 300, y: 0, width: 10, height: 10},
        }),
        [],
      );
      assert.strictEqual(compareStub.called, false);
    });
    it('should find nothing when the template is larger than the container', async function () {
      useScreenshot(await screenImage());
      compareStub.callsFake(async (...args: any[]) => {
        const {width = 0, height = 0} = await sharp(args[1]).metadata();
        if (width < rect.width || height < rect.height) {
          throw new NoImageOccurrencesError('Cannot find any occurrences of the partial image in the full image');
        }
        return {rect, score};
      });
      await assert.rejects(
        f.findByImage(template, d as any, {
          multiple: false,
          containerRect: {x: 0, y: 0, width: 10, height: 10},
        }),
        /element could not be located/,
      );
    });
    it('should return no elements when the template is larger than the container', async function () {
      useScreenshot(await screenImage());
      compareStub.callsFake(async (...args: any[]) => {
        const {width = 0, height = 0} = await sharp(args[1]).metadata();
        if (width < rect.width || height < rect.height) {
          throw new NoImageOccurrencesError('Cannot find any occurrences of the partial image in the full image');
        }
        return [{rect, score}];
      });
      assert.deepStrictEqual(
        await f.findByImage(template, d as any, {
          multiple: true,
          containerRect: {x: 0, y: 0, width: 10, height: 10},
        }),
        [],
      );
    });
    it('should fail if driver does not support getWindowRect', async function () {
      (d as any).getWindowRect = null;
      await assert.rejects(f.findByImage(template, d as any, {multiple: false}), /driver does not support/);
    });
    it('should fix template size if requested', async function () {
      const newTemplate = 'iVBORbaz';
      const newTemplateBuf = Buffer.from(newTemplate, 'base64');
      await (d as any).settings.update({fixImageTemplateSize: true});
      sandbox.stub(f, 'ensureTemplateSize').resolves(newTemplateBuf);
      const imgElProto = await f.findByImage(template, d as any, {multiple: false});
      const imgEl = basicImgElVerify(imgElProto, f);
      assert.strictEqual(imgEl!.originalImage, newTemplate);
      assert.deepStrictEqual(compareStub.lastCall.args[2], newTemplateBuf);
    });

    it('should fix template size scale if requested', async function () {
      const newTemplate = 'iVBORbaz';
      const newTemplateBuf = Buffer.from(newTemplate, 'base64');
      await (d as any).settings.update({fixImageTemplateScale: true});
      sandbox.stub(f, 'fixImageTemplateScale').resolves(newTemplateBuf);
      const imgElProto = await f.findByImage(template, d as any, {multiple: false});
      const imgEl = basicImgElVerify(imgElProto, f);
      assert.strictEqual(imgEl!.originalImage, newTemplate);
      assert.deepStrictEqual(compareStub.lastCall.args[2], newTemplateBuf);
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
      assert.strictEqual(compareStub.called, true);
      const lastCallArgs = compareStub.lastCall?.args;
      assert.deepStrictEqual(lastCallArgs![2], template);
    });

    it('should throw an error if template match fails', async function () {
      compareStub.rejects(new NoImageOccurrencesError('Cannot find any occurrences'));
      await assert.rejects(f.findByImage(template, d as any, {multiple: false}), /element could not be located/);
    });
    it('should return empty array for multiple elements if template match fails', async function () {
      compareStub.rejects(new NoImageOccurrencesError('Cannot find any occurrences'));
      assert.deepStrictEqual(await f.findByImage(template, d as any, {multiple: true}), []);
    });
    it('should respect implicit wait', async function () {
      // the wait budget must exceed the 500ms poll interval, otherwise whether the retry happens
      // at all depends on how quickly the first attempt returns
      (d as any).setImplicitWait(2000);
      compareStub.resetHistory();
      compareStub.returns({rect, score});
      compareStub.onFirstCall().throws(new NoImageOccurrencesError('Cannot find any occurrences'));
      const imgElProto = await f.findByImage(template, d as any, {multiple: false});
      basicImgElVerify(imgElProto, f);
      assert.strictEqual(compareStub.calledTwice, true);
    });
    it('should not add element to cache and return it directly when checking staleness', async function () {
      const imgEl = (await f.findByImage(template, d as any, {
        multiple: false,
        shouldCheckStaleness: true,
      })) as ImageElement;
      assert.ok(imgEl instanceof ImageElement);
      assert.strictEqual(f.getImageElement(imgEl.id), undefined);
      assert.deepStrictEqual(imgEl.rect, rect);
    });
  });

  describe('fixImageTemplateScale', function () {
    let f: TImageElementFinder;
    const basicTemplate = 'iVBORbaz';
    const basicTemplateBuf = Buffer.from(basicTemplate, 'base64');

    beforeEach(async function () {
      f = new ImageElementFinder();
    });

    it('should not fix template size scale if no scale value', async function () {
      assert.deepStrictEqual(
        await f.fixImageTemplateScale(basicTemplateBuf, {fixImageTemplateScale: true}),
        basicTemplateBuf,
      );
    });

    it('should not resize when scales are within float precision of 1', async function () {
      // FLOAT_PRECISION is meant to treat near-1 values as the default scale.
      // The yScale check previously compared a boolean, so a tiny float error
      // on y forced an unnecessary resize.
      assert.deepStrictEqual(
        await f.fixImageTemplateScale(TINY_PNG_BUF, {
          fixImageTemplateScale: true,
          xScale: 1.000001,
          yScale: 1.000001,
        }),
        TINY_PNG_BUF,
      );
    });

    it('should not fix template size scale if it is null', async function () {
      assert.deepStrictEqual(await f.fixImageTemplateScale(basicTemplateBuf, null as any), basicTemplateBuf);
    });

    it('should not fix template size scale if it is not number', async function () {
      assert.deepStrictEqual(await f.fixImageTemplateScale(basicTemplateBuf, 'wrong-scale' as any), basicTemplateBuf);
    });

    it('should fix template size scale', async function () {
      assert.notDeepStrictEqual(
        await f.fixImageTemplateScale(TINY_PNG_BUF, {
          fixImageTemplateScale: true,
          xScale: 1.5,
          yScale: 1.5,
        }),
        TINY_PNG_BUF,
      );
    });

    it('should not fix template size scale because of fixImageTemplateScale being false', async function () {
      assert.deepStrictEqual(
        await f.fixImageTemplateScale(TINY_PNG_BUF, {
          fixImageTemplateScale: false,
          xScale: 1.5,
          yScale: 1.5,
        }),
        TINY_PNG_BUF,
      );
    });

    it('should fix template size scale with default scale', async function () {
      assert.notDeepStrictEqual(
        await f.fixImageTemplateScale(TINY_PNG_BUF, {
          defaultImageTemplateScale: 4.0,
        }),
        TINY_PNG_BUF,
      );
    });

    it('should fix template size scale with default scale and image scale', async function () {
      assert.notDeepStrictEqual(
        await f.fixImageTemplateScale(TINY_PNG_BUF, {
          defaultImageTemplateScale: 4.0,
          fixImageTemplateScale: true,
          xScale: 1.5,
          yScale: 1.5,
        }),
        TINY_PNG_BUF,
      );
    });

    it('should not fix template size scale with default scale and image scale', async function () {
      assert.notDeepStrictEqual(
        await f.fixImageTemplateScale(TINY_PNG_BUF, {
          defaultImageTemplateScale: 4.0,
          fixImageTemplateScale: false,
          xScale: 1.5,
          yScale: 1.5,
        }),
        TINY_PNG_BUF,
      );
    });

    it('should not fix template size scale because of ignoreDefaultImageTemplateScale', async function () {
      assert.deepStrictEqual(
        await f.fixImageTemplateScale(TINY_PNG_BUF, {
          defaultImageTemplateScale: 4.0,
          ignoreDefaultImageTemplateScale: true,
        }),
        TINY_PNG_BUF,
      );
    });

    it('should ignore defaultImageTemplateScale to fix template size scale because of ignoreDefaultImageTemplateScale', async function () {
      assert.notDeepStrictEqual(
        await f.fixImageTemplateScale(TINY_PNG_BUF, {
          defaultImageTemplateScale: 4.0,
          ignoreDefaultImageTemplateScale: true,
          fixImageTemplateScale: true,
          xScale: 1.5,
          yScale: 1.5,
        }),
        TINY_PNG_BUF,
      );
    });
  });

  describe('ensureTemplateSize', function () {
    const f = new ImageElementFinder();

    it('should not resize the template if it is smaller than the screen', async function () {
      const [width, height] = TINY_PNG_DIMS.map((n) => n * 2);
      assert.deepStrictEqual(await f.ensureTemplateSize(TINY_PNG_BUF, {width, height}), TINY_PNG_BUF);
    });
    it('should not resize the template if it is the same size as the screen', async function () {
      const [width, height] = TINY_PNG_DIMS;
      assert.deepStrictEqual(await f.ensureTemplateSize(TINY_PNG_BUF, {width, height}), TINY_PNG_BUF);
    });
    it('should resize the template if it is bigger than the screen', async function () {
      const [width, height] = TINY_PNG_DIMS.map((n) => n / 2);
      const newTemplateBuf = await f.ensureTemplateSize(TINY_PNG_BUF, {width, height});
      assert.notDeepStrictEqual(newTemplateBuf, TINY_PNG_BUF);
      assert.ok(newTemplateBuf.length < TINY_PNG_BUF.length);
    });
  });

  describe('getScreenshotForImageFind', function () {
    let d: PluginDriver;
    let f: TImageElementFinder;

    beforeEach(function () {
      d = new PluginDriver();
      f = new ImageElementFinder();
      sandbox.stub(d, 'getScreenshot').resolves(TINY_PNG);
    });

    it('should fail if driver does not support getScreenshot', async function () {
      await assert.rejects(
        new ImageElementFinder().getScreenshotForImageFind(new BaseDriver<Constraints>({} as any) as any, {
          width: 100,
          height: 100,
        }),
        /driver does not support/,
      );
    });
    it('should not adjust or verify screenshot if asked not to by settings', async function () {
      await (d as any).settings.update({fixImageFindScreenshotDims: false});
      const [width, height] = TINY_PNG_DIMS.map((n) => n + 1);
      const {screenshot, scale} = await f.getScreenshotForImageFind(d as any, {width, height} as any);
      assert.deepStrictEqual(screenshot, TINY_PNG_BUF);
      assert.strictEqual(scale, undefined);
    });
    it('should return screenshot without adjustment if it matches screen size', async function () {
      const [width, height] = TINY_PNG_DIMS;
      const {screenshot, scale} = await f.getScreenshotForImageFind(d as any, {width, height} as any);
      assert.deepStrictEqual(screenshot, TINY_PNG_BUF);
      assert.strictEqual(scale, undefined);
    });
    it('should crop the screenshot to the container', async function () {
      const containerRect = {x: 1.2, y: 0.4, width: 2.2, height: 3.6};
      const {screenshot, crop} = await f.getScreenshotForImageFind(
        d as any,
        {width: 4, height: 4} as any,
        containerRect,
      );
      const {width, height} = await sharp(screenshot).metadata();
      assert.deepStrictEqual(crop, {x: 1, y: 0, width: 3, height: 4});
      assert.strictEqual(width, 3);
      assert.strictEqual(height, 4);
    });
    it('should crop the resized screenshot to the container', async function () {
      const containerRect = {x: 2, y: 2, width: 4, height: 4};
      const {screenshot, scale, crop} = await f.getScreenshotForImageFind(
        d as any,
        {width: 8, height: 8} as any,
        containerRect,
      );
      const {width, height, format} = await sharp(screenshot).metadata();
      assert.deepStrictEqual(crop, containerRect);
      assert.deepStrictEqual({width, height, format}, {width: 4, height: 4, format: 'png'});
      assert.deepStrictEqual(scale, {xScale: 2, yScale: 2});
    });
    it('should return no crop when the container is outside the screenshot', async function () {
      const {crop} = await f.getScreenshotForImageFind(d as any, {width: 4, height: 4} as any, {
        x: 8,
        y: 0,
        width: 2,
        height: 2,
      });
      assert.strictEqual(crop, null);
    });
    it('should reject a container crop when the screenshot is not an image and verification is off', async function () {
      await (d as any).settings.update({fixImageFindScreenshotDims: false});
      (d.getScreenshot as any).resolves(Buffer.from('nope').toString('base64'));
      await assert.rejects(
        f.getScreenshotForImageFind(d as any, {width: 4, height: 4} as any, {x: 0, y: 0, width: 2, height: 2}),
        (err: any) =>
          err instanceof errors.InvalidElementStateError &&
          /Screenshot width\/height cannot be determined/.test(err.message),
      );
    });
    it('should reject a container crop when the screenshot is not an image and verification is on', async function () {
      (d.getScreenshot as any).resolves(Buffer.from('nope').toString('base64'));
      await assert.rejects(
        f.getScreenshotForImageFind(d as any, {width: 4, height: 4} as any, {x: 0, y: 0, width: 2, height: 2}),
        (err: any) =>
          err instanceof errors.InvalidElementStateError &&
          /Screenshot width\/height cannot be determined/.test(err.message),
      );
    });
    it('should return scaled screenshot with same aspect ratio if matching screen aspect ratio', async function () {
      const [width, height] = TINY_PNG_DIMS.map((n) => n * 1.5);
      const {screenshot, scale} = await f.getScreenshotForImageFind(d as any, {width, height} as any);
      assert.notDeepStrictEqual(screenshot, TINY_PNG_BUF);
      const screenshotObj = sharp(screenshot);
      const {width: screenWidth, height: screenHeight} = await screenshotObj.metadata();
      assert.strictEqual(screenWidth, width);
      assert.strictEqual(screenHeight, height);
      assert.deepStrictEqual(scale, {xScale: 1.5, yScale: 1.5});
    });
    it('should return scaled screenshot with different aspect ratio if not matching screen aspect ratio', async function () {
      // try first with portrait screen, screen = 8 x 12
      let [width, height] = [TINY_PNG_DIMS[0] * 2, TINY_PNG_DIMS[1] * 3];
      let expectedScale = {xScale: 2.67, yScale: 4};

      const {screenshot, scale} = await f.getScreenshotForImageFind(d as any, {width, height} as any);
      assert.notDeepStrictEqual(screenshot, TINY_PNG_BUF);
      let screenshotObj = sharp(screenshot);
      let {width: screenWidth, height: screenHeight} = await screenshotObj.metadata();
      assert.strictEqual(screenWidth, width);
      assert.strictEqual(screenHeight, height);
      assert.strictEqual(scale!.xScale.toFixed(2), expectedScale.xScale.toString());
      assert.strictEqual(scale!.yScale, expectedScale.yScale);

      // then with landscape screen, screen = 12 x 8
      [width, height] = [TINY_PNG_DIMS[0] * 3, TINY_PNG_DIMS[1] * 2];
      expectedScale = {xScale: 4, yScale: 2.67};

      const {screenshot: newScreen, scale: newScale} = await f.getScreenshotForImageFind(
        d as any,
        {width, height} as any,
      );
      assert.notDeepStrictEqual(newScreen, TINY_PNG_BUF);
      screenshotObj = sharp(newScreen);
      ({width: screenWidth, height: screenHeight} = await screenshotObj.metadata());
      assert.strictEqual(screenWidth, width);
      assert.strictEqual(screenHeight, height);
      assert.strictEqual(newScale!.xScale, expectedScale.xScale);
      assert.strictEqual(newScale!.yScale.toFixed(2), expectedScale.yScale.toString());
    });

    it('should return scaled screenshot with different aspect ratio if not matching screen aspect ratio with fixImageTemplateScale', async function () {
      // try first with portrait screen, screen = 8 x 12
      let [width, height] = [TINY_PNG_DIMS[0] * 2, TINY_PNG_DIMS[1] * 3];
      let expectedScale = {xScale: 2.67, yScale: 4};

      const {screenshot, scale} = await f.getScreenshotForImageFind(d as any, {width, height} as any);
      assert.notDeepStrictEqual(screenshot, TINY_PNG_BUF);
      let screenshotObj = sharp(screenshot);
      let {width: screenWidth, height: screenHeight} = await screenshotObj.metadata();
      assert.strictEqual(screenWidth, width);
      assert.strictEqual(screenHeight, height);
      assert.strictEqual(scale!.xScale.toFixed(2), expectedScale.xScale.toString());
      assert.strictEqual(scale!.yScale, expectedScale.yScale);
      // 8 x 12 stretched TINY_PNG
      assert.notDeepStrictEqual(
        await f.fixImageTemplateScale(screenshot, {
          fixImageTemplateScale: true,
          xScale: scale!.xScale,
          yScale: scale!.yScale,
        }),
        TINY_PNG_BUF,
      );

      // then with landscape screen, screen = 12 x 8
      [width, height] = [TINY_PNG_DIMS[0] * 3, TINY_PNG_DIMS[1] * 2];
      expectedScale = {xScale: 4, yScale: 2.67};

      const {screenshot: newScreen, scale: newScale} = await f.getScreenshotForImageFind(
        d as any,
        {width, height} as any,
      );
      assert.notDeepStrictEqual(newScreen, TINY_PNG_BUF);
      screenshotObj = sharp(newScreen);
      ({width: screenWidth, height: screenHeight} = await screenshotObj.metadata());
      assert.strictEqual(screenWidth, width);
      assert.strictEqual(screenHeight, height);
      assert.strictEqual(newScale!.xScale, expectedScale.xScale);
      assert.strictEqual(newScale!.yScale.toFixed(2), expectedScale.yScale.toString());
      // 12 x 8 stretched TINY_PNG
      assert.notDeepStrictEqual(
        await f.fixImageTemplateScale(newScreen, {
          fixImageTemplateScale: true,
          xScale: newScale!.xScale,
          yScale: newScale!.yScale,
        }),
        TINY_PNG_BUF,
      );
    });
  });
});
