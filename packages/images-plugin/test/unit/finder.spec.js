import _ from 'lodash';
import {imageUtil} from 'appium/support';
import {BaseDriver} from 'appium/driver';
import {ImageElementPlugin, IMAGE_STRATEGY} from '../../lib/plugin';
import {ImageElementFinder, W3C_ELEMENT_KEY} from '../../lib/finder';
import {ImageElement} from '../../lib/image-element';
import sinon from 'sinon';
import {TINY_PNG, TINY_PNG_DIMS} from '../fixtures';

const compareModule = require('../../lib/compare');

const plugin = new ImageElementPlugin();

class PluginDriver extends BaseDriver {
  async getWindowSize() {}
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
    const screenshot = 'iVBORfoo';
    const template = 'iVBORbar';
    /** @type {PluginDriver} */
    let d;
    /** @type {ImageElementFinder} */
    let f;
    /** @type {import('sinon').SinonStubbedMember<import('../../lib/compare').compareImages>} */
    let compareStub;

    function basicStub(driver, finder) {
      const sizeStub = sandbox.stub(driver, 'getWindowSize').returns(size);
      const screenStub = sandbox.stub(finder, 'getScreenshotForImageFind').returns(screenshot);
      return {sizeStub, screenStub};
    }

    /**
     *
     * @param {Element} imgElProto
     * @param {ImageElementFinder} finder
     * @returns
     */
    function basicImgElVerify(imgElProto, finder) {
      const imgElId = imgElProto[W3C_ELEMENT_KEY];
      finder.imgElCache.has(imgElId).should.be.true;
      const imgEl = finder.imgElCache.get(imgElId);
      (imgEl instanceof ImageElement).should.be.true;
      imgEl.rect.should.eql(rect);
      imgEl.score.should.eql(score);
      return imgEl;
    }

    beforeEach(function () {
      d = new PluginDriver();
      f = new ImageElementFinder(d);
      compareStub = sandbox;
      compareStub = sandbox.stub(compareModule, 'compareImages');
      compareStub.resolves({rect, score});
      basicStub(d, f);
    });

    it('should find an image element happypath', async function () {
      const imgElProto = await f.findByImage(template, {multiple: false});
      basicImgElVerify(imgElProto, f);
    });
    it('should find image elements happypath', async function () {
      compareStub.resolves([{rect, score}]);
      const els = await f.findByImage(template, {multiple: true});
      els.should.have.length(1);
      basicImgElVerify(els[0], f);
    });
    it('should fail if driver does not support getWindowSize', async function () {
      d.getWindowSize = null;
      await f
        .findByImage(template, {multiple: false})
        .should.eventually.be.rejectedWith(/driver does not support/);
    });
    it('should fix template size if requested', async function () {
      const newTemplate = 'iVBORbaz';
      await d.settings.update({fixImageTemplateSize: true});
      sandbox.stub(f, 'ensureTemplateSize').returns(newTemplate);
      const imgElProto = await f.findByImage(template, {multiple: false});
      const imgEl = basicImgElVerify(imgElProto, f);
      imgEl.template.should.eql(newTemplate);
      _.last(compareStub.args)[2].should.eql(newTemplate);
    });

    it('should fix template size scale if requested', async function () {
      const newTemplate = 'iVBORbaz';
      await d.settings.update({fixImageTemplateScale: true});
      sandbox.stub(f, 'fixImageTemplateScale').returns(newTemplate);
      const imgElProto = await f.findByImage(template, {multiple: false});
      const imgEl = basicImgElVerify(imgElProto, f);
      imgEl.template.should.eql(newTemplate);
      _.last(compareStub.args)[2].should.eql(newTemplate);
    });
    it('should not fix template size scale if it is not requested', async function () {
      const newTemplate = 'iVBORbaz';
      await d.settings.update({});
      sandbox.stub(f, 'fixImageTemplateScale').returns(newTemplate);
      f.fixImageTemplateScale.callCount.should.eql(0);
    });

    it('should throw an error if template match fails', async function () {
      compareStub.rejects(new Error('Cannot find any occurrences'));
      await f
        .findByImage(template, {multiple: false})
        .should.be.rejectedWith(/element could not be located/);
    });
    it('should return empty array for multiple elements if template match fails', async function () {
      compareStub.rejects(new Error('Cannot find any occurrences'));
      await f.findByImage(template, {multiple: true}).should.eventually.eql([]);
    });
    it('should respect implicit wait', async function () {
      d.setImplicitWait(10);
      compareStub.resetHistory();
      compareStub.returns({rect, score});
      compareStub.onFirstCall().throws(new Error('Cannot find any occurrences'));
      const imgElProto = await f.findByImage(template, {multiple: false});
      basicImgElVerify(imgElProto, f);
      compareStub.should.have.been.calledTwice;
    });
    it('should not add element to cache and return it directly when checking staleness', async function () {
      const imgEl = await f.findByImage(template, {
        multiple: false,
        shouldCheckStaleness: true,
      });
      (imgEl instanceof ImageElement).should.be.true;
      f.imgElCache.has(imgEl.id).should.be.false;
      imgEl.rect.should.eql(rect);
    });
  });

  describe('fixImageTemplateScale', function () {
    let d;
    /** @type {ImageElementFinder} */
    let f;
    const basicTemplate = 'iVBORbaz';

    beforeEach(function () {
      d = new PluginDriver();
      f = new ImageElementFinder(d);
    });

    it('should not fix template size scale if no scale value', async function () {
      await f
        .fixImageTemplateScale(basicTemplate, {fixImageTemplateScale: true})
        .should.eventually.eql(basicTemplate);
    });

    it('should not fix template size scale if it is null', async function () {
      await f.fixImageTemplateScale(basicTemplate, null).should.eventually.eql(basicTemplate);
    });

    it('should not fix template size scale if it is not number', async function () {
      await f
        .fixImageTemplateScale(basicTemplate, 'wrong-scale')
        .should.eventually.eql(basicTemplate);
    });

    it('should fix template size scale', async function () {
      const actual =
        'iVBORw0KGgoAAAANSUhEUgAAAAYAAAAGCAYAAADgzO9IAAAAWElEQVR4AU3BQRWAQAhAwa/PGBsEgrC16AFBKEIPXW7OXO+Rmey9iQjMjHFzrLUwM7qbqmLcHKpKRFBVuDvj4agq3B1VRUQYT2bS3QwRQVUZF/CaGRHB3wc1vSZbHO5+BgAAAABJRU5ErkJggg==';
      await f
        .fixImageTemplateScale(TINY_PNG, {
          fixImageTemplateScale: true,
          xScale: 1.5,
          yScale: 1.5,
        })
        .should.eventually.eql(actual);
    });

    it('should not fix template size scale because of fixImageTemplateScale being false', async function () {
      await f
        .fixImageTemplateScale(TINY_PNG, {
          fixImageTemplateScale: false,
          xScale: 1.5,
          yScale: 1.5,
        })
        .should.eventually.eql(TINY_PNG);
    });

    it('should fix template size scale with default scale', async function () {
      const actual =
        'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABwUlEQVR4AaXBPUsrQQCG0SeX+cBdkTjwTpG1NPgLpjY/fW1stt4UYmm2cJqwMCsaw70uJJ3CBc9Z/P3Cl+12S9u2tG1L27bEGLm/v2ez2bDZbJDEd/7wS4YT7z3X19fc3Nxwd3dHXdd47xnHkefnZ8ZxpKoq6rqmqiqMMcwMJ1VV0TQN0zThnOPj44O6rsk503UdkmiahqZpWK1WGGOYGU7quqZpGqy1SCLnTM6Z19dXcs5IYpomrLVI4uLigpnhpKoqVqsVkjgcDjw9PdF1HTlnuq5DEs45JHE4HDgznByPR97e3pimiVIK4zhyPB7x3hNCIITA5eUl3nsWiwVnhpNSCsMwsNvtGIaB/X5PKQVJpJSQxHq9RhLOOc4MJ9M0sdvt2G639H3PTBIxRiQhCUnEGLHWcmY4KaUwDAN93/P4+MhyuSSlhCRSSkjCOYe1FmstZ6bve2YvLy/s93tmy+USSUhCEpIIIfAd8/DwwOz9/Z1SCpJIKSGJ9XqNJJxz/MS0bcvs6uoKScQYkYQkJBFjxFrLT0zbtsxub29JKSGJlBKScM5hrcVay09MzplZjJHPz0+894QQCCHwP/7wS/8A4e6nAg+R8LwAAAAASUVORK5CYII=';
      await f
        .fixImageTemplateScale(TINY_PNG, {
          defaultImageTemplateScale: 4.0,
        })
        .should.eventually.eql(actual);
    });

    it('should fix template size scale with default scale and image scale', async function () {
      const actual =
        'iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAACaUlEQVR4AbXBMWvrWBSF0c9BsFPtW91UR1U6+///FKlKKt8qqnyqnMozggkI8xgMj6x1uv+L/6zryrIsrOvKsiys68qyLFwuF87nM5fLhfP5zOVy4Xw+84wXftkLv2ziQBK26b0TEVQVu4jANrvM5Hq9spOEJCQhCUlI4mjiQBK26b1TVewkYRvb7DKTMQaZiW1s01rDNraRxNHEgSRaa1QVO0m01jjKTDKTXe+d3jtVxU4SjyYOJGGbnSRs03snM8lMMpPb7UZmkplEBFXFThK2eTRxIAnbSMI2VcX39zdjDMYYZCaZyRiDMQZVxU4StqkqHk0cSEISf5KZ7DKTMQbLsrCTRGuN3jtVxaOJg6qiqqgqqoqqoqoYY5CZ7GwTEdzvd97f34kIeu/YRhKPJg6qiswkM7ndbmQmmUlmkpnsbBMR2CYimOeZ3ju2kcSjiYOqIjP5+vpi2za2bWPbNo5aa7TW2PXe6b3Te6e1hiQeTRxUFbfbjW3bGGNwvV4ZY2Ab27TWsI1tbGMb27TWsI0kHk0cVBWZybZtXK9XPj8/+fj4YJ5nIoLWGraJCOZ5RhKSkIQkJPFo4qCqyEy2bWOMwefnJ+u6cjqdsM3ONvM8cz6feca0ris/rtcrmcnONhHB/X7n/f2diKD3jm0k8axpWRZ+ZCaZyc42EYFtIoJ5num9YxtJPGta15U/sY1tdm9vb/Te6b1jG0k8a1qWhR+2sU1rjdYatrGNbWxjm9YaknjWtK4rPyKCiKC1hm0igojg9fUVSUhCEpJ41rQsC0e22dkmIrhcLvyNF/7H6XTib73wy174Zf8AJEsePtlPj10AAAAASUVORK5CYII=';
      await f
        .fixImageTemplateScale(TINY_PNG, {
          defaultImageTemplateScale: 4.0,
          fixImageTemplateScale: true,
          xScale: 1.5,
          yScale: 1.5,
        })
        .should.eventually.eql(actual);
    });

    it('should not fix template size scale with default scale and image scale', async function () {
      const actual =
        'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABwUlEQVR4AaXBPUsrQQCG0SeX+cBdkTjwTpG1NPgLpjY/fW1stt4UYmm2cJqwMCsaw70uJJ3CBc9Z/P3Cl+12S9u2tG1L27bEGLm/v2ez2bDZbJDEd/7wS4YT7z3X19fc3Nxwd3dHXdd47xnHkefnZ8ZxpKoq6rqmqiqMMcwMJ1VV0TQN0zThnOPj44O6rsk503UdkmiahqZpWK1WGGOYGU7quqZpGqy1SCLnTM6Z19dXcs5IYpomrLVI4uLigpnhpKoqVqsVkjgcDjw9PdF1HTlnuq5DEs45JHE4HDgznByPR97e3pimiVIK4zhyPB7x3hNCIITA5eUl3nsWiwVnhpNSCsMwsNvtGIaB/X5PKQVJpJSQxHq9RhLOOc4MJ9M0sdvt2G639H3PTBIxRiQhCUnEGLHWcmY4KaUwDAN93/P4+MhyuSSlhCRSSkjCOYe1FmstZ6bve2YvLy/s93tmy+USSUhCEpIIIfAd8/DwwOz9/Z1SCpJIKSGJ9XqNJJxz/MS0bcvs6uoKScQYkYQkJBFjxFrLT0zbtsxub29JKSGJlBKScM5hrcVay09MzplZjJHPz0+894QQCCHwP/7wS/8A4e6nAg+R8LwAAAAASUVORK5CYII=';
      await f
        .fixImageTemplateScale(TINY_PNG, {
          defaultImageTemplateScale: 4.0,
          fixImageTemplateScale: false,
          xScale: 1.5,
          yScale: 1.5,
        })
        .should.eventually.eql(actual);
    });

    it('should not fix template size scale because of ignoreDefaultImageTemplateScale', async function () {
      await f
        .fixImageTemplateScale(TINY_PNG, {
          defaultImageTemplateScale: 4.0,
          ignoreDefaultImageTemplateScale: true,
        })
        .should.eventually.eql(TINY_PNG);
    });

    it('should ignore defaultImageTemplateScale to fix template size scale because of ignoreDefaultImageTemplateScale', async function () {
      const actual =
        'iVBORw0KGgoAAAANSUhEUgAAAAYAAAAGCAYAAADgzO9IAAAAWElEQVR4AU3BQRWAQAhAwa/PGBsEgrC16AFBKEIPXW7OXO+Rmey9iQjMjHFzrLUwM7qbqmLcHKpKRFBVuDvj4agq3B1VRUQYT2bS3QwRQVUZF/CaGRHB3wc1vSZbHO5+BgAAAABJRU5ErkJggg==';
      await f
        .fixImageTemplateScale(TINY_PNG, {
          defaultImageTemplateScale: 4.0,
          ignoreDefaultImageTemplateScale: true,
          fixImageTemplateScale: true,
          xScale: 1.5,
          yScale: 1.5,
        })
        .should.eventually.eql(actual);
    });
  });

  describe('ensureTemplateSize', function () {
    const d = new PluginDriver();
    const f = new ImageElementFinder(d);

    it('should not resize the template if it is smaller than the screen', async function () {
      const screen = TINY_PNG_DIMS.map((n) => n * 2);
      await f.ensureTemplateSize(TINY_PNG, ...screen).should.eventually.eql(TINY_PNG);
    });
    it('should not resize the template if it is the same size as the screen', async function () {
      await f.ensureTemplateSize(TINY_PNG, ...TINY_PNG_DIMS).should.eventually.eql(TINY_PNG);
    });
    it('should resize the template if it is bigger than the screen', async function () {
      const screen = TINY_PNG_DIMS.map((n) => n / 2);
      const newTemplate = await f.ensureTemplateSize(TINY_PNG, ...screen);
      newTemplate.should.not.eql(TINY_PNG);
      newTemplate.length.should.be.below(TINY_PNG.length);
    });
  });

  describe('getScreenshotForImageFind', function () {
    let d;
    /** @type {ImageElementFinder} */
    let f;

    beforeEach(function () {
      d = new PluginDriver();
      f = new ImageElementFinder(d);
      sandbox.stub(d, 'getScreenshot').returns(TINY_PNG);
    });

    it('should fail if driver does not support getScreenshot', async function () {
      const d = new BaseDriver();
      const f = new ImageElementFinder(d);
      await f
        .getScreenshotForImageFind()
        .should.eventually.be.rejectedWith(/driver does not support/);
    });
    it('should not adjust or verify screenshot if asked not to by settings', async function () {
      await d.settings.update({fixImageFindScreenshotDims: false});
      const screen = TINY_PNG_DIMS.map((n) => n + 1);
      const {b64Screenshot, scale} = await f.getScreenshotForImageFind(...screen);
      b64Screenshot.should.eql(TINY_PNG);
      should.equal(scale, undefined);
    });
    it('should return screenshot without adjustment if it matches screen size', async function () {
      const {b64Screenshot, scale} = await f.getScreenshotForImageFind(...TINY_PNG_DIMS);
      b64Screenshot.should.eql(TINY_PNG);
      should.equal(scale, undefined);
    });
    it('should return scaled screenshot with same aspect ratio if matching screen aspect ratio', async function () {
      const screen = TINY_PNG_DIMS.map((n) => n * 1.5);
      const {b64Screenshot, scale} = await f.getScreenshotForImageFind(...screen);
      b64Screenshot.should.not.eql(TINY_PNG);
      const screenshotObj = await imageUtil.getJimpImage(b64Screenshot);
      screenshotObj.bitmap.width.should.eql(screen[0]);
      screenshotObj.bitmap.height.should.eql(screen[1]);
      scale.should.eql({xScale: 1.5, yScale: 1.5});
    });
    it('should return scaled screenshot with different aspect ratio if not matching screen aspect ratio', async function () {
      // try first with portrait screen, screen = 8 x 12
      let screen = [TINY_PNG_DIMS[0] * 2, TINY_PNG_DIMS[1] * 3];
      let expectedScale = {xScale: 2.67, yScale: 4};

      const {b64Screenshot, scale} = await f.getScreenshotForImageFind(...screen);
      b64Screenshot.should.not.eql(TINY_PNG);
      let screenshotObj = await imageUtil.getJimpImage(b64Screenshot);
      screenshotObj.bitmap.width.should.eql(screen[0]);
      screenshotObj.bitmap.height.should.eql(screen[1]);
      scale.xScale.toFixed(2).should.eql(expectedScale.xScale.toString());
      scale.yScale.should.eql(expectedScale.yScale);

      // then with landscape screen, screen = 12 x 8
      screen = [TINY_PNG_DIMS[0] * 3, TINY_PNG_DIMS[1] * 2];
      expectedScale = {xScale: 4, yScale: 2.67};

      const {b64Screenshot: newScreen, scale: newScale} = await f.getScreenshotForImageFind(
        ...screen
      );
      newScreen.should.not.eql(TINY_PNG);
      screenshotObj = await imageUtil.getJimpImage(newScreen);
      screenshotObj.bitmap.width.should.eql(screen[0]);
      screenshotObj.bitmap.height.should.eql(screen[1]);
      newScale.xScale.should.eql(expectedScale.xScale);
      newScale.yScale.toFixed(2).should.eql(expectedScale.yScale.toString());
    });

    it('should return scaled screenshot with different aspect ratio if not matching screen aspect ratio with fixImageTemplateScale', async function () {
      // try first with portrait screen, screen = 8 x 12
      let screen = [TINY_PNG_DIMS[0] * 2, TINY_PNG_DIMS[1] * 3];
      let expectedScale = {xScale: 2.67, yScale: 4};

      const {b64Screenshot, scale} = await f.getScreenshotForImageFind(...screen);
      b64Screenshot.should.not.eql(TINY_PNG);
      let screenshotObj = await imageUtil.getJimpImage(b64Screenshot);
      screenshotObj.bitmap.width.should.eql(screen[0]);
      screenshotObj.bitmap.height.should.eql(screen[1]);
      scale.xScale.toFixed(2).should.eql(expectedScale.xScale.toString());
      scale.yScale.should.eql(expectedScale.yScale);
      // 8 x 12 stretched TINY_PNG
      await f
        .fixImageTemplateScale(b64Screenshot, {
          fixImageTemplateScale: true,
          scale,
        })
        .should.eventually.eql(
          'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAMCAYAAABfnvydAAAAJ0lEQVR4AYXBAQEAIACDMKR/p0fTBrKdbZcPCRIkSJAgQYIECRIkPAzBA1TpeNwZAAAAAElFTkSuQmCC'
        );

      // then with landscape screen, screen = 12 x 8
      screen = [TINY_PNG_DIMS[0] * 3, TINY_PNG_DIMS[1] * 2];
      expectedScale = {xScale: 4, yScale: 2.67};

      const {b64Screenshot: newScreen, scale: newScale} = await f.getScreenshotForImageFind(
        ...screen
      );
      newScreen.should.not.eql(TINY_PNG);
      screenshotObj = await imageUtil.getJimpImage(newScreen);
      screenshotObj.bitmap.width.should.eql(screen[0]);
      screenshotObj.bitmap.height.should.eql(screen[1]);
      newScale.xScale.should.eql(expectedScale.xScale);
      newScale.yScale.toFixed(2).should.eql(expectedScale.yScale.toString());
      // 12 x 8 stretched TINY_PNG
      await f
        .fixImageTemplateScale(newScreen, {fixImageTemplateScale: true, scale})
        .should.eventually.eql(
          'iVBORw0KGgoAAAANSUhEUgAAAAwAAAAICAYAAADN5B7xAAAAI0lEQVR4AZXBAQEAMAyDMI5/T5W2ayB5245AIokkkkgiiST6+W4DTLyo5PUAAAAASUVORK5CYII='
        );
    });
  });
});
