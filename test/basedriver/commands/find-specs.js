import chai from 'chai';
import path from 'path';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { BaseDriver, ImageElement } from '../../..';
import { IMAGE_STRATEGY, CUSTOM_STRATEGY } from '../../../lib/basedriver/commands/find';
import { imageUtil } from 'appium-support';


chai.should();
chai.use(chaiAsPromised);

class TestDriver extends BaseDriver {
  async getWindowSize () {}
  async getScreenshot () {}
}

const CUSTOM_FIND_MODULE = path.resolve(__dirname, "..", "..", "..", "..",
  "test", "basedriver", "fixtures", "custom-element-finder");
const BAD_CUSTOM_FIND_MODULE = path.resolve(__dirname, "..", "..", "..", "..",
  "test", "basedriver", "fixtures", "custom-element-finder-bad");

const TINY_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQwIDc5LjE2MDQ1MSwgMjAxNy8wNS8wNi0wMTowODoyMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6N0NDMDM4MDM4N0U2MTFFOEEzMzhGMTRFNUUwNzIwNUIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6N0NDMDM4MDQ4N0U2MTFFOEEzMzhGMTRFNUUwNzIwNUIiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo3Q0MwMzgwMTg3RTYxMUU4QTMzOEYxNEU1RTA3MjA1QiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo3Q0MwMzgwMjg3RTYxMUU4QTMzOEYxNEU1RTA3MjA1QiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PpdvJjQAAAAlSURBVHjaJInBEQAACIKw/Xe2Ul5wYBtwmJqkk4+zfvUQVoABAEg0EfrZwc0hAAAAAElFTkSuQmCC";
const TINY_PNG_DIMS = [4, 4];

describe('finding elements by image', function () {
  describe('findElement', function () {
    it('should use a different special method to find element by image', async function () {
      const d = new TestDriver();
      sinon.stub(d, 'findByImage').returns(true);
      sinon.stub(d, 'findElOrElsWithProcessing').returns(false);
      await d.findElement(IMAGE_STRATEGY, 'foo').should.eventually.be.true;
      await d.findElements(IMAGE_STRATEGY, 'foo').should.eventually.be.true;
    });
    it('should not be able to find image element from any other element', async function () {
      const d = new TestDriver();
      await d.findElementFromElement(IMAGE_STRATEGY, 'foo', 'elId')
        .should.eventually.be.rejectedWith(/Locator Strategy.+is not supported/);
      await d.findElementsFromElement(IMAGE_STRATEGY, 'foo', 'elId')
        .should.eventually.be.rejectedWith(/Locator Strategy.+is not supported/);
    });
  });

  describe('findByImage', function () {
    const rect = {x: 10, y: 20, width: 30, height: 40};
    const size = {width: 100, height: 200};
    const screenshot = 'iVBORfoo';
    const template = 'iVBORbar';

    function basicStub (driver) {
      const sizeStub = sinon.stub(driver, 'getWindowSize').returns(size);
      const screenStub = sinon.stub(driver, 'getScreenshotForImageFind').returns(screenshot);
      const compareStub = sinon.stub(driver, 'compareImages').returns({rect});
      return {sizeStub, screenStub, compareStub};
    }

    function basicImgElVerify (imgElProto, driver) {
      const imgElId = imgElProto.ELEMENT;
      driver._imgElCache.has(imgElId).should.be.true;
      const imgEl = driver._imgElCache.get(imgElId);
      (imgEl instanceof ImageElement).should.be.true;
      imgEl.rect.should.eql(rect);
      return imgEl;
    }

    it('should find an image element happypath', async function () {
      const d = new TestDriver();
      basicStub(d);
      const imgElProto = await d.findByImage(template, {multiple: false});
      basicImgElVerify(imgElProto, d);
    });
    it('should find image elements happypath', async function () {
      const d = new TestDriver();
      basicStub(d);
      const els = await d.findByImage(template, {multiple: true});
      els.should.have.length(1);
      basicImgElVerify(els[0], d);
    });
    it('should fail if driver does not support getWindowSize', async function () {
      const d = new BaseDriver();
      await d.findByImage(template, {multiple: false})
        .should.eventually.be.rejectedWith(/driver does not support/);
    });
    it('should fix template size if requested', async function () {
      const d = new TestDriver();
      const newTemplate = 'iVBORbaz';
      const {compareStub} = basicStub(d);
      await d.settings.update({fixImageTemplateSize: true});
      sinon.stub(d, 'ensureTemplateSize').returns(newTemplate);
      const imgElProto = await d.findByImage(template, {multiple: false});
      const imgEl = basicImgElVerify(imgElProto, d);
      imgEl.template.should.eql(newTemplate);
      compareStub.args[0][2].should.eql(newTemplate);
    });
    it('should throw an error if template match fails', async function () {
      const d = new TestDriver();
      const {compareStub} = basicStub(d);
      compareStub.throws(new Error('Cannot find any occurrences'));
      await d.findByImage(template, {multiple: false})
        .should.eventually.be.rejectedWith(/element could not be located/);
    });
    it('should return empty array for multiple elements if template match fails', async function () {
      const d = new TestDriver();
      const {compareStub} = basicStub(d);
      compareStub.throws(new Error('Cannot find any occurrences'));
      await d.findByImage(template, {multiple: true}).should.eventually.eql([]);
    });
    it('should respect implicit wait', async function () {
      const d = new TestDriver();
      d.setImplicitWait(10);
      const {compareStub} = basicStub(d);
      compareStub.onCall(0).throws(new Error('Cannot find any occurrences'));
      const imgElProto = await d.findByImage(template, {multiple: false});
      basicImgElVerify(imgElProto, d);
      compareStub.callCount.should.eql(2);
    });
    it('should not add element to cache and return it directly when checking staleness', async function () {
      const d = new TestDriver();
      basicStub(d);
      const imgEl = await d.findByImage(template, {multiple: false, shouldCheckStaleness: true});
      (imgEl instanceof ImageElement).should.be.true;
      d._imgElCache.has(imgEl.id).should.be.false;
      imgEl.rect.should.eql(rect);
    });
  });

  describe('ensureTemplateSize', function () {
    it('should not resize the template if it is smaller than the screen', async function () {
      const screen = TINY_PNG_DIMS.map(n => n * 2);
      const d = new TestDriver();
      await d.ensureTemplateSize(TINY_PNG, ...screen)
        .should.eventually.eql(TINY_PNG);
    });
    it('should not resize the template if it is the same size as the screen', async function () {
      const d = new TestDriver();
      await d.ensureTemplateSize(TINY_PNG, ...TINY_PNG_DIMS)
        .should.eventually.eql(TINY_PNG);
    });
    it('should resize the template if it is bigger than the screen', async function () {
      const d = new TestDriver();
      const screen = TINY_PNG_DIMS.map(n => n / 2);
      const newTemplate = await d.ensureTemplateSize(TINY_PNG, ...screen);
      newTemplate.should.not.eql(TINY_PNG);
      newTemplate.length.should.be.below(TINY_PNG.length);
    });
  });

  describe('getScreenshotForImageFind', function () {
    it('should fail if driver does not support getScreenshot', async function () {
      const d = new BaseDriver();
      await d.getScreenshotForImageFind()
        .should.eventually.be.rejectedWith(/driver does not support/);
    });
    it('should not adjust or verify screenshot if asked not to by settings', async function () {
      const d = new TestDriver();
      sinon.stub(d, 'getScreenshot').returns(TINY_PNG);
      d.settings.update({fixImageFindScreenshotDims: false});
      const screen = TINY_PNG_DIMS.map(n => n + 1);
      await d.getScreenshotForImageFind(...screen)
        .should.eventually.eql(TINY_PNG);
    });
    it('should return screenshot without adjustment if it matches screen size', async function () {
      const d = new TestDriver();
      sinon.stub(d, 'getScreenshot').returns(TINY_PNG);
      await d.getScreenshotForImageFind(...TINY_PNG_DIMS)
        .should.eventually.eql(TINY_PNG);
    });
    it('should return scaled screenshot with same aspect ratio if matching screen aspect ratio', async function () {
      const d = new TestDriver();
      sinon.stub(d, 'getScreenshot').returns(TINY_PNG);
      const screen = TINY_PNG_DIMS.map(n => n * 1.5);
      const newScreenshot = await d.getScreenshotForImageFind(...screen);
      newScreenshot.should.not.eql(TINY_PNG);
      const screenshotObj = await imageUtil.getJimpImage(newScreenshot);
      screenshotObj.bitmap.width.should.eql(screen[0]);
      screenshotObj.bitmap.height.should.eql(screen[1]);
    });
    it('should return scaled screenshot with different aspect ratio if not matching screen aspect ratio', async function () {
      const d = new TestDriver();
      sinon.stub(d, 'getScreenshot').returns(TINY_PNG);

      // try first with portrait screen
      let screen = [TINY_PNG_DIMS[0] * 2, TINY_PNG_DIMS[1] * 3];
      let newScreenshot = await d.getScreenshotForImageFind(...screen);
      newScreenshot.should.not.eql(TINY_PNG);
      let screenshotObj = await imageUtil.getJimpImage(newScreenshot);
      screenshotObj.bitmap.width.should.eql(screen[0]);
      screenshotObj.bitmap.height.should.eql(screen[1]);

      // then with landscape screen
      screen = [TINY_PNG_DIMS[0] * 3, TINY_PNG_DIMS[1] * 2];
      newScreenshot = await d.getScreenshotForImageFind(...screen);
      newScreenshot.should.not.eql(TINY_PNG);
      screenshotObj = await imageUtil.getJimpImage(newScreenshot);
      screenshotObj.bitmap.width.should.eql(screen[0]);
      screenshotObj.bitmap.height.should.eql(screen[1]);
    });
  });
});

describe('custom element finding plugins', function () {
  // happys
  it('should find a single element using a custom finder', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, "f:foo").should.eventually.eql("bar");
  });
  it('should not require selector prefix if only one find plugin is registered', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, "foo").should.eventually.eql("bar");
  });
  it('should find multiple elements using a custom finder', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE};
    await d.findElements(CUSTOM_STRATEGY, "f:foos").should.eventually.eql(["baz1", "baz2"]);
  });
  it('should give a hint to the plugin about whether multiple are requested', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, "f:foos").should.eventually.eql("bar1");
  });
  it('should be able to use multiple find modules', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE, g: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, "f:foo").should.eventually.eql("bar");
    await d.findElement(CUSTOM_STRATEGY, "g:foo").should.eventually.eql("bar");
  });

  // errors
  it('should throw an error if customFindModules is not set', async function () {
    const d = new BaseDriver();
    await d.findElement(CUSTOM_STRATEGY, "f:foo").should.eventually.be.rejectedWith(/customFindModules/);
  });
  it('should throw an error if customFindModules is the wrong shape', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = CUSTOM_FIND_MODULE;
    await d.findElement(CUSTOM_STRATEGY, "f:foo").should.eventually.be.rejectedWith(/customFindModules/);
  });
  it('should throw an error if customFindModules is size > 1 and no selector prefix is used', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE, g: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, "foo").should.eventually.be.rejectedWith(/multiple element finding/i);
  });
  it('should throw an error in attempt to use unregistered plugin', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE, g: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, "z:foo").should.eventually.be.rejectedWith(/was not registered/);
  });
  it('should throw an error if plugin cannot be loaded', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: "./foo.js"};
    await d.findElement(CUSTOM_STRATEGY, "f:foo").should.eventually.be.rejectedWith(/could not load/i);
  });
  it('should throw an error if plugin is not the right shape', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: BAD_CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, "f:foo").should.eventually.be.rejectedWith(/constructed correctly/i);
  });
  it('should pass on an error thrown by the finder itself', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, "f:error").should.eventually.be.rejectedWith(/plugin error/i);
  });
  it('should throw no such element error if element not found', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, "f:nope").should.eventually.be.rejectedWith(/could not be located/);
  });
});
