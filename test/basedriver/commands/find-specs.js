import chai from 'chai';
import path from 'path';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { BaseDriver, ImageElement } from '../../..';
import { IMAGE_STRATEGY, CUSTOM_STRATEGY, helpers } from '../../../lib/basedriver/commands/find';
import { imageUtil } from 'appium-support';


const should = chai.should();
chai.use(chaiAsPromised);


class TestDriver extends BaseDriver {
  async getWindowSize () {}
  async getScreenshot () {}
}

const CUSTOM_FIND_MODULE = path.resolve(__dirname, '..', '..', '..', '..',
  'test', 'basedriver', 'fixtures', 'custom-element-finder');
const BAD_CUSTOM_FIND_MODULE = path.resolve(__dirname, '..', '..', '..', '..',
  'test', 'basedriver', 'fixtures', 'custom-element-finder-bad');

const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQwIDc5LjE2MDQ1MSwgMjAxNy8wNS8wNi0wMTowODoyMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6N0NDMDM4MDM4N0U2MTFFOEEzMzhGMTRFNUUwNzIwNUIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6N0NDMDM4MDQ4N0U2MTFFOEEzMzhGMTRFNUUwNzIwNUIiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo3Q0MwMzgwMTg3RTYxMUU4QTMzOEYxNEU1RTA3MjA1QiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo3Q0MwMzgwMjg3RTYxMUU4QTMzOEYxNEU1RTA3MjA1QiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PpdvJjQAAAAlSURBVHjaJInBEQAACIKw/Xe2Ul5wYBtwmJqkk4+zfvUQVoABAEg0EfrZwc0hAAAAAElFTkSuQmCC';
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
    const score = 0.9;
    const size = {width: 100, height: 200};
    const screenshot = 'iVBORfoo';
    const template = 'iVBORbar';

    function basicStub (driver) {
      const sizeStub = sinon.stub(driver, 'getWindowSize').returns(size);
      const screenStub = sinon.stub(driver, 'getScreenshotForImageFind').returns(screenshot);
      const compareStub = sinon.stub(driver, 'compareImages').returns({rect, score});
      return {sizeStub, screenStub, compareStub};
    }

    function basicImgElVerify (imgElProto, driver) {
      const imgElId = imgElProto.ELEMENT;
      driver._imgElCache.has(imgElId).should.be.true;
      const imgEl = driver._imgElCache.get(imgElId);
      (imgEl instanceof ImageElement).should.be.true;
      imgEl.rect.should.eql(rect);
      imgEl.score.should.eql(score);
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

    it('should fix template size scale if requested', async function () {
      const d = new TestDriver();
      const newTemplate = 'iVBORbaz';
      const {compareStub} = basicStub(d);
      await d.settings.update({fixImageTemplateScale: true});
      sinon.stub(d, 'fixImageTemplateScale').returns(newTemplate);
      const imgElProto = await d.findByImage(template, {multiple: false});
      const imgEl = basicImgElVerify(imgElProto, d);
      imgEl.template.should.eql(newTemplate);
      compareStub.args[0][2].should.eql(newTemplate);
    });
    it('should not fix template size scale if it is not requested', async function () {
      const d = new TestDriver();
      const newTemplate = 'iVBORbaz';
      basicStub(d);
      await d.settings.update({});
      sinon.stub(d, 'fixImageTemplateScale').returns(newTemplate);
      d.fixImageTemplateScale.callCount.should.eql(0);
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

  describe('fixImageTemplateScale', function () {
    it('should not fix template size scale if no scale value', async function () {
      const newTemplate = 'iVBORbaz';
      await helpers.fixImageTemplateScale(newTemplate, {fixImageTemplateScale: true})
        .should.eventually.eql(newTemplate);
    });

    it('should not fix template size scale if it is null', async function () {
      const newTemplate = 'iVBORbaz';
      await helpers.fixImageTemplateScale(newTemplate, null)
        .should.eventually.eql(newTemplate);
    });

    it('should not fix template size scale if it is not number', async function () {
      const newTemplate = 'iVBORbaz';
      await helpers.fixImageTemplateScale(newTemplate, 'wrong-scale')
        .should.eventually.eql(newTemplate);
    });

    it('should fix template size scale', async function () {
      const actual = 'iVBORw0KGgoAAAANSUhEUgAAAAYAAAAGCAYAAADgzO9IAAAAWElEQVR4AU3BQRWAQAhAwa/PGBsEgrC16AFBKEIPXW7OXO+Rmey9iQjMjHFzrLUwM7qbqmLcHKpKRFBVuDvj4agq3B1VRUQYT2bS3QwRQVUZF/CaGRHB3wc1vSZbHO5+BgAAAABJRU5ErkJggg==';
      await helpers.fixImageTemplateScale(TINY_PNG, {
        fixImageTemplateScale: true, xScale: 1.5, yScale: 1.5
      }).should.eventually.eql(actual);
    });

    it('should not fix template size scale because of fixImageTemplateScale is false', async function () {
      await helpers.fixImageTemplateScale(TINY_PNG, {
        fixImageTemplateScale: false, xScale: 1.5, yScale: 1.5
      }).should.eventually.eql(TINY_PNG);
    });

    it('should fix template size scale with default scale', async function () {
      const actual = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABwUlEQVR4AaXBPUsrQQCG0SeX+cBdkTjwTpG1NPgLpjY/fW1stt4UYmm2cJqwMCsaw70uJJ3CBc9Z/P3Cl+12S9u2tG1L27bEGLm/v2ez2bDZbJDEd/7wS4YT7z3X19fc3Nxwd3dHXdd47xnHkefnZ8ZxpKoq6rqmqiqMMcwMJ1VV0TQN0zThnOPj44O6rsk503UdkmiahqZpWK1WGGOYGU7quqZpGqy1SCLnTM6Z19dXcs5IYpomrLVI4uLigpnhpKoqVqsVkjgcDjw9PdF1HTlnuq5DEs45JHE4HDgznByPR97e3pimiVIK4zhyPB7x3hNCIITA5eUl3nsWiwVnhpNSCsMwsNvtGIaB/X5PKQVJpJSQxHq9RhLOOc4MJ9M0sdvt2G639H3PTBIxRiQhCUnEGLHWcmY4KaUwDAN93/P4+MhyuSSlhCRSSkjCOYe1FmstZ6bve2YvLy/s93tmy+USSUhCEpIIIfAd8/DwwOz9/Z1SCpJIKSGJ9XqNJJxz/MS0bcvs6uoKScQYkYQkJBFjxFrLT0zbtsxub29JKSGJlBKScM5hrcVay09MzplZjJHPz0+894QQCCHwP/7wS/8A4e6nAg+R8LwAAAAASUVORK5CYII=';
      await helpers.fixImageTemplateScale(TINY_PNG, {
        defaultImageTemplateScale: 4.0
      }).should.eventually.eql(actual);
    });

    it('should fix template size scale with default scale and image scale', async function () {
      const actual = 'iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAACaUlEQVR4AbXBMWvrWBSF0c9BsFPtW91UR1U6+///FKlKKt8qqnyqnMozggkI8xgMj6x1uv+L/6zryrIsrOvKsiys68qyLFwuF87nM5fLhfP5zOVy4Xw+84wXftkLv2ziQBK26b0TEVQVu4jANrvM5Hq9spOEJCQhCUlI4mjiQBK26b1TVewkYRvb7DKTMQaZiW1s01rDNraRxNHEgSRaa1QVO0m01jjKTDKTXe+d3jtVxU4SjyYOJGGbnSRs03snM8lMMpPb7UZmkplEBFXFThK2eTRxIAnbSMI2VcX39zdjDMYYZCaZyRiDMQZVxU4StqkqHk0cSEISf5KZ7DKTMQbLsrCTRGuN3jtVxaOJg6qiqqgqqoqqoqoYY5CZ7GwTEdzvd97f34kIeu/YRhKPJg6qiswkM7ndbmQmmUlmkpnsbBMR2CYimOeZ3ju2kcSjiYOqIjP5+vpi2za2bWPbNo5aa7TW2PXe6b3Te6e1hiQeTRxUFbfbjW3bGGNwvV4ZY2Ab27TWsI1tbGMb27TWsI0kHk0cVBWZybZtXK9XPj8/+fj4YJ5nIoLWGraJCOZ5RhKSkIQkJPFo4qCqyEy2bWOMwefnJ+u6cjqdsM3ONvM8cz6feca0ris/rtcrmcnONhHB/X7n/f2diKD3jm0k8axpWRZ+ZCaZyc42EYFtIoJ5num9YxtJPGta15U/sY1tdm9vb/Te6b1jG0k8a1qWhR+2sU1rjdYatrGNbWxjm9YaknjWtK4rPyKCiKC1hm0igojg9fUVSUhCEpJ41rQsC0e22dkmIrhcLvyNF/7H6XTib73wy174Zf8AJEsePtlPj10AAAAASUVORK5CYII=';
      await helpers.fixImageTemplateScale(TINY_PNG, {
        defaultImageTemplateScale: 4.0,
        fixImageTemplateScale: true,
        xScale: 1.5, yScale: 1.5
      }).should.eventually.eql(actual);
    });

    it('should not fix template size scale with default scale and image scale', async function () {
      const actual = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABwUlEQVR4AaXBPUsrQQCG0SeX+cBdkTjwTpG1NPgLpjY/fW1stt4UYmm2cJqwMCsaw70uJJ3CBc9Z/P3Cl+12S9u2tG1L27bEGLm/v2ez2bDZbJDEd/7wS4YT7z3X19fc3Nxwd3dHXdd47xnHkefnZ8ZxpKoq6rqmqiqMMcwMJ1VV0TQN0zThnOPj44O6rsk503UdkmiahqZpWK1WGGOYGU7quqZpGqy1SCLnTM6Z19dXcs5IYpomrLVI4uLigpnhpKoqVqsVkjgcDjw9PdF1HTlnuq5DEs45JHE4HDgznByPR97e3pimiVIK4zhyPB7x3hNCIITA5eUl3nsWiwVnhpNSCsMwsNvtGIaB/X5PKQVJpJSQxHq9RhLOOc4MJ9M0sdvt2G639H3PTBIxRiQhCUnEGLHWcmY4KaUwDAN93/P4+MhyuSSlhCRSSkjCOYe1FmstZ6bve2YvLy/s93tmy+USSUhCEpIIIfAd8/DwwOz9/Z1SCpJIKSGJ9XqNJJxz/MS0bcvs6uoKScQYkYQkJBFjxFrLT0zbtsxub29JKSGJlBKScM5hrcVay09MzplZjJHPz0+894QQCCHwP/7wS/8A4e6nAg+R8LwAAAAASUVORK5CYII=';
      await helpers.fixImageTemplateScale(TINY_PNG, {
        defaultImageTemplateScale: 4.0,
        fixImageTemplateScale: false,
        xScale: 1.5, yScale: 1.5
      }).should.eventually.eql(actual);
    });

    it('should not fix template size scale because of ignoreDefaultImageTemplateScale', async function () {
      await helpers.fixImageTemplateScale(TINY_PNG, {
        defaultImageTemplateScale: 4.0,
        ignoreDefaultImageTemplateScale: true,
      }).should.eventually.eql(TINY_PNG);
    });

    it('should ignore defaultImageTemplateScale to fix template size scale because of ignoreDefaultImageTemplateScale', async function () {
      const actual = 'iVBORw0KGgoAAAANSUhEUgAAAAYAAAAGCAYAAADgzO9IAAAAWElEQVR4AU3BQRWAQAhAwa/PGBsEgrC16AFBKEIPXW7OXO+Rmey9iQjMjHFzrLUwM7qbqmLcHKpKRFBVuDvj4agq3B1VRUQYT2bS3QwRQVUZF/CaGRHB3wc1vSZbHO5+BgAAAABJRU5ErkJggg==';
      await helpers.fixImageTemplateScale(TINY_PNG, {
        defaultImageTemplateScale: 4.0,
        ignoreDefaultImageTemplateScale: true,
        fixImageTemplateScale: true,
        xScale: 1.5, yScale: 1.5
      }).should.eventually.eql(actual);
    });
  });

  describe('ensureTemplateSize', function () {
    it('should not resize the template if it is smaller than the screen', async function () {
      const screen = TINY_PNG_DIMS.map((n) => n * 2);
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
      const screen = TINY_PNG_DIMS.map((n) => n / 2);
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
      const screen = TINY_PNG_DIMS.map((n) => n + 1);
      const {b64Screenshot, scale} = await d.getScreenshotForImageFind(...screen);
      b64Screenshot.should.eql(TINY_PNG);
      should.equal(scale, undefined);
    });
    it('should return screenshot without adjustment if it matches screen size', async function () {
      const d = new TestDriver();
      sinon.stub(d, 'getScreenshot').returns(TINY_PNG);
      const {b64Screenshot, scale} = await d.getScreenshotForImageFind(...TINY_PNG_DIMS);
      b64Screenshot.should.eql(TINY_PNG);
      should.equal(scale, undefined);
    });
    it('should return scaled screenshot with same aspect ratio if matching screen aspect ratio', async function () {
      const d = new TestDriver();
      sinon.stub(d, 'getScreenshot').returns(TINY_PNG);
      const screen = TINY_PNG_DIMS.map((n) => n * 1.5);
      const {b64Screenshot, scale} = await d.getScreenshotForImageFind(...screen);
      b64Screenshot.should.not.eql(TINY_PNG);
      const screenshotObj = await imageUtil.getJimpImage(b64Screenshot);
      screenshotObj.bitmap.width.should.eql(screen[0]);
      screenshotObj.bitmap.height.should.eql(screen[1]);
      scale.should.eql({ xScale: 1.5, yScale: 1.5 });
    });
    it('should return scaled screenshot with different aspect ratio if not matching screen aspect ratio', async function () {
      const d = new TestDriver();
      sinon.stub(d, 'getScreenshot').returns(TINY_PNG);

      // try first with portrait screen, screen = 8 x 12
      let screen = [TINY_PNG_DIMS[0] * 2, TINY_PNG_DIMS[1] * 3];
      let expectedScale = { xScale: 2.67, yScale: 4 };

      const {b64Screenshot, scale} = await d.getScreenshotForImageFind(...screen);
      b64Screenshot.should.not.eql(TINY_PNG);
      let screenshotObj = await imageUtil.getJimpImage(b64Screenshot);
      screenshotObj.bitmap.width.should.eql(screen[0]);
      screenshotObj.bitmap.height.should.eql(screen[1]);
      scale.xScale.toFixed(2).should.eql(expectedScale.xScale.toString());
      scale.yScale.should.eql(expectedScale.yScale);

      // then with landscape screen, screen = 12 x 8
      screen = [TINY_PNG_DIMS[0] * 3, TINY_PNG_DIMS[1] * 2];
      expectedScale = { xScale: 4, yScale: 2.67 };

      const {b64Screenshot: newScreen, scale: newScale} = await d.getScreenshotForImageFind(...screen);
      newScreen.should.not.eql(TINY_PNG);
      screenshotObj = await imageUtil.getJimpImage(newScreen);
      screenshotObj.bitmap.width.should.eql(screen[0]);
      screenshotObj.bitmap.height.should.eql(screen[1]);
      newScale.xScale.should.eql(expectedScale.xScale);
      newScale.yScale.toFixed(2).should.eql(expectedScale.yScale.toString());
    });

    it('should return scaled screenshot with different aspect ratio if not matching screen aspect ratio with fixImageTemplateScale', async function () {
      const d = new TestDriver();
      sinon.stub(d, 'getScreenshot').returns(TINY_PNG);

      // try first with portrait screen, screen = 8 x 12
      let screen = [TINY_PNG_DIMS[0] * 2, TINY_PNG_DIMS[1] * 3];
      let expectedScale = { xScale: 2.67, yScale: 4 };

      const {b64Screenshot, scale} = await d.getScreenshotForImageFind(...screen);
      b64Screenshot.should.not.eql(TINY_PNG);
      let screenshotObj = await imageUtil.getJimpImage(b64Screenshot);
      screenshotObj.bitmap.width.should.eql(screen[0]);
      screenshotObj.bitmap.height.should.eql(screen[1]);
      scale.xScale.toFixed(2).should.eql(expectedScale.xScale.toString());
      scale.yScale.should.eql(expectedScale.yScale);
      // 8 x 12 stretched TINY_PNG
      await helpers.fixImageTemplateScale(b64Screenshot, {fixImageTemplateScale: true, scale})
        .should.eventually.eql('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAMCAYAAABfnvydAAAAJ0lEQVR4AYXBAQEAIACDMKR/p0fTBrKdbZcPCRIkSJAgQYIECRIkPAzBA1TpeNwZAAAAAElFTkSuQmCC');

      // then with landscape screen, screen = 12 x 8
      screen = [TINY_PNG_DIMS[0] * 3, TINY_PNG_DIMS[1] * 2];
      expectedScale = { xScale: 4, yScale: 2.67 };

      const {b64Screenshot: newScreen, scale: newScale} = await d.getScreenshotForImageFind(...screen);
      newScreen.should.not.eql(TINY_PNG);
      screenshotObj = await imageUtil.getJimpImage(newScreen);
      screenshotObj.bitmap.width.should.eql(screen[0]);
      screenshotObj.bitmap.height.should.eql(screen[1]);
      newScale.xScale.should.eql(expectedScale.xScale);
      newScale.yScale.toFixed(2).should.eql(expectedScale.yScale.toString());
      // 12 x 8 stretched TINY_PNG
      await helpers.fixImageTemplateScale(newScreen, {fixImageTemplateScale: true, scale})
        .should.eventually.eql('iVBORw0KGgoAAAANSUhEUgAAAAwAAAAICAYAAADN5B7xAAAAI0lEQVR4AZXBAQEAMAyDMI5/T5W2ayB5245AIokkkkgiiST6+W4DTLyo5PUAAAAASUVORK5CYII=');
    });

  });
});

describe('custom element finding plugins', function () {
  // happys
  it('should find a single element using a custom finder', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, 'f:foo').should.eventually.eql('bar');
  });
  it('should not require selector prefix if only one find plugin is registered', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, 'foo').should.eventually.eql('bar');
  });
  it('should find multiple elements using a custom finder', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE};
    await d.findElements(CUSTOM_STRATEGY, 'f:foos').should.eventually.eql(['baz1', 'baz2']);
  });
  it('should give a hint to the plugin about whether multiple are requested', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, 'f:foos').should.eventually.eql('bar1');
  });
  it('should be able to use multiple find modules', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE, g: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, 'f:foo').should.eventually.eql('bar');
    await d.findElement(CUSTOM_STRATEGY, 'g:foo').should.eventually.eql('bar');
  });

  // errors
  it('should throw an error if customFindModules is not set', async function () {
    const d = new BaseDriver();
    await d.findElement(CUSTOM_STRATEGY, 'f:foo').should.eventually.be.rejectedWith(/customFindModules/);
  });
  it('should throw an error if customFindModules is the wrong shape', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = CUSTOM_FIND_MODULE;
    await d.findElement(CUSTOM_STRATEGY, 'f:foo').should.eventually.be.rejectedWith(/customFindModules/);
  });
  it('should throw an error if customFindModules is size > 1 and no selector prefix is used', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE, g: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, 'foo').should.eventually.be.rejectedWith(/multiple element finding/i);
  });
  it('should throw an error in attempt to use unregistered plugin', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE, g: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, 'z:foo').should.eventually.be.rejectedWith(/was not registered/);
  });
  it('should throw an error if plugin cannot be loaded', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: './foo.js'};
    await d.findElement(CUSTOM_STRATEGY, 'f:foo').should.eventually.be.rejectedWith(/could not load/i);
  });
  it('should throw an error if plugin is not the right shape', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: BAD_CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, 'f:foo').should.eventually.be.rejectedWith(/constructed correctly/i);
  });
  it('should pass on an error thrown by the finder itself', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, 'f:error').should.eventually.be.rejectedWith(/plugin error/i);
  });
  it('should throw no such element error if element not found', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, 'f:nope').should.eventually.be.rejectedWith(/could not be located/);
  });
});
