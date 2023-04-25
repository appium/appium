import _ from 'lodash';
import LRU from 'lru-cache';
import {errors} from 'appium/driver';
import {imageUtil} from 'appium/support';
import {ImageElement} from './image-element';
import {compareImages} from './compare';
import log from './logger';
import {
  DEFAULT_SETTINGS, MATCH_TEMPLATE_MODE, DEFAULT_TEMPLATE_IMAGE_SCALE,
  DEFAULT_FIX_IMAGE_TEMPLATE_SCALE,
} from './constants';

// Used to compare ratio and screen width
// Pixel is basically under 1080 for example. 100K is probably enough fo a while.
const FLOAT_PRECISION = 100000;
const MAX_CACHE_ITEMS = 100;
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_SIZE_BYTES = 1024 * 1024 * 40; // 40mb

/**
 * Checks if one rect fully contains another
 *
 * @param {import('@appium/types').Rect} templateRect The bounding rect
 * @param {import('@appium/types').Rect} rect The rect to be checked for containment
 * @returns {boolean} True if templateRect contains rect
 */
function containsRect(templateRect, rect) {
  return templateRect.x <= rect.x && templateRect.y <= rect.y
      && rect.width <= templateRect.x + templateRect.width - rect.x
      && rect.height <= templateRect.y + templateRect.height - rect.y;
}

const NO_OCCURRENCES_PATTERN = /Cannot find any occurrences/;
const CONDITION_UNMET_PATTERN = /Condition unmet/;


export default class ImageElementFinder {
  /** @type {LRU<string,ImageElement>} */
  _imgElCache;

  /**
   * @param {number} maxSize
   */
  constructor(maxSize = MAX_CACHE_SIZE_BYTES) {
    this._imgElCache = new LRU({
      ttl: MAX_CACHE_AGE_MS,
      updateAgeOnGet: true,
      max: MAX_CACHE_ITEMS,
      maxSize,
      sizeCalculation: (el) => el.template.length + (el.matchedImage?.length ?? 0),
    });
  }

  /**
   * @param {ImageElement} imgEl
   * @returns {Element}
   */
  registerImageElement(imgEl) {
    this._imgElCache.set(imgEl.id, imgEl);
    return imgEl.asElement();
  }

  /**
   * @param {string} imgElId
   * @returns {ImageElement|undefined}
   */
  getImageElement(imgElId) {
    return this._imgElCache.get(imgElId);
  }

  /**
   * @param {string} deletedSessionId
   */
  revokeObsoleteImageElements(deletedSessionId) {
    const elementIdsToDelete = [];
    for (const [elId, imgEl] of this._imgElCache.entries()) {
      if (imgEl.sessionId === deletedSessionId) {
        elementIdsToDelete.push(elId);
      }
    }
    for (const elId of elementIdsToDelete) {
      this._imgElCache.delete(elId);
    }
  }

  /**
   * @typedef FindByImageOptions
   * @property {boolean} [shouldCheckStaleness=false] - whether this call to find an
   * image is merely to check staleness. If so we can bypass a lot of logic
   * @property {boolean} [multiple=false] - Whether we are finding one element or
   * multiple
   * @property {boolean} [ignoreDefaultImageTemplateScale=false] - Whether we
   * ignore defaultImageTemplateScale. It can be used when you would like to
   * scale b64Template with defaultImageTemplateScale setting.
   * @property {import('@appium/types').Rect?} containerRect - The bounding
   * rectangle to limit the search in
   */

  /**
   * Find a screen rect represented by an ImageElement corresponding to an image
   * template sent in by the client
   *
   * @param {string} b64Template - base64-encoded image used as a template to be
   * matched in the screenshot
   * @param {ExternalDriver} driver
   * @param {FindByImageOptions} opts - additional options
   *
   * @returns {Promise<Element|Element[]|ImageElement>} - WebDriver element with a special id prefix
   */
  async findByImage(
    b64Template,
    driver,
    {shouldCheckStaleness = false, multiple = false, ignoreDefaultImageTemplateScale = false, containerRect = null}
  ) {
    const settings = {...DEFAULT_SETTINGS, ...driver.settings.getSettings()};
    const {
      imageMatchThreshold: threshold,
      imageMatchMethod,
      fixImageTemplateSize,
      fixImageTemplateScale,
      defaultImageTemplateScale,
      getMatchedImageResult: visualize,
    } = settings;

    log.info(`Finding image element with match threshold ${threshold}`);
    if (!driver.getWindowRect && !driver.getWindowSize) {
      throw new Error("This driver does not support the required 'getWindowRect' command");
    }
    let screenSize;
    if (driver.getWindowRect) {
      const screenRect = await driver.getWindowRect();
      screenSize = {
        width: screenRect.width,
        height: screenRect.height,
      };
    } else {
      // TODO: Drop the deprecated endpoint
      screenSize = await driver.getWindowSize();
    }

    // someone might have sent in a template that's larger than the screen
    // dimensions. If so let's check and cut it down to size since the algorithm
    // will not work unless we do. But because it requires some potentially
    // expensive commands, only do this if the user has requested it in settings.
    if (fixImageTemplateSize) {
      b64Template = await this.ensureTemplateSize(b64Template, {
        width: containerRect ? containerRect.width : screenSize.width,
        height: containerRect ? containerRect.height : screenSize.height,
      });
    }

    const results = [];
    const condition = async () => {
      try {
        const {b64Screenshot, scale} = await this.getScreenshotForImageFind(driver, screenSize);

        b64Template = await this.fixImageTemplateScale(b64Template, {
          defaultImageTemplateScale,
          ignoreDefaultImageTemplateScale,
          fixImageTemplateScale,
          ...scale,
        });

        const comparisonOpts = {
          threshold,
          visualize,
          multiple,
        };
        if (imageMatchMethod) {
          comparisonOpts.method = imageMatchMethod;
        }

        const pushIfOk = (el) => {
          if (containerRect && !containsRect(containerRect, el.rect)) {
            log.debug(
              `The matched element rectangle ${JSON.stringify(el.rect)} is not located ` +
              `inside of the bounding rectangle ${JSON.stringify(containerRect)}, thus rejected`
            );
            return false;
          }
          results.push(el);
          return true;
        };

        const elOrEls = await compareImages(MATCH_TEMPLATE_MODE, b64Screenshot, b64Template, comparisonOpts);
        return _.some((_.isArray(elOrEls) ? elOrEls : [elOrEls]).map(pushIfOk));
      } catch (err) {
        // if compareImages fails, we'll get a specific error, but we should
        // retry, so trap that and just return false to trigger the next round of
        // implicitly waiting. For other errors, throw them to get out of the
        // implicit wait loop
        if (NO_OCCURRENCES_PATTERN.test(err.message)) {
          return false;
        }
        throw err;
      }
    };

    try {
      await driver.implicitWaitForCondition(condition);
    } catch (err) {
      // this `implicitWaitForCondition` method will throw a 'Condition unmet'
      // error if an element is not found eventually. In that case, we will
      // handle the element not found response below. In the case where get some
      // _other_ kind of error, it means something blew up totally apart from the
      // implicit wait timeout. We should not mask that error and instead throw
      // it straightaway
      if (!CONDITION_UNMET_PATTERN.test(err.message)) {
        throw err;
      }
    }

    if (_.isEmpty(results)) {
      if (multiple) {
        return [];
      }
      throw new errors.NoSuchElementError();
    }

    const elements = results.map(({rect, score, visualization}) => {
      log.info(`Image template matched: ${JSON.stringify(rect)}`);
      return new ImageElement({
        b64Template,
        rect,
        score,
        b64Result: visualization,
        finder: this,
        containerRect,
        sessionId: driver.sessionId,
      });
    });

    // if we're just checking staleness, return straightaway so we don't add
    // a new element to the cache. shouldCheckStaleness does not support multiple
    // elements, since it is a purely internal mechanism
    if (shouldCheckStaleness) {
      return elements[0];
    }

    const registeredElements = elements.map((imgEl) => this.registerImageElement(imgEl));

    return multiple ? registeredElements : registeredElements[0];
  }

  /**
   * Ensure that the image template sent in for a find is of a suitable size
   *
   * @param {string} b64Template - base64-encoded image
   * @param {import('@appium/types').Size} maxSize - size of the bounding rectangle
   *
   * @returns {Promise<string>} base64-encoded image, potentially resized
   */
  async ensureTemplateSize(b64Template, maxSize) {
    let imgObj = await imageUtil.getJimpImage(b64Template);
    let {width: tplWidth, height: tplHeight} = imgObj.bitmap;

    log.info(
      `Template image is ${tplWidth}x${tplHeight}. Bounding rectangle size is ${maxSize.width}x${maxSize.height}`
    );
    // if the template fits inside the screen dimensions, we're good
    if (tplWidth <= maxSize.width && tplHeight <= maxSize.height) {
      return b64Template;
    }

    log.info(
      `Scaling template image from ${tplWidth}x${tplHeight} to match ` +
      `the bounding rectangle at ${maxSize.width}x${maxSize.height}`
    );
    // otherwise, scale it to fit inside the bounding rectangle dimensions
    imgObj = imgObj.scaleToFit(maxSize.width, maxSize.height);
    return (await imgObj.getBuffer(imageUtil.MIME_PNG)).toString('base64');
  }

  /**
   * Get the screenshot image that will be used for find by element, potentially
   * altering it in various ways based on user-requested settings
   *
   * @param {ExternalDriver} driver
   * @param {import('@appium/types').Size} screenSize - The original size of the screen
   *
   * @returns {Promise<Screenshot & {scale?: ScreenshotScale}>} base64-encoded screenshot and ScreenshotScale
   */
  async getScreenshotForImageFind(driver, screenSize) {
    if (!driver.getScreenshot) {
      throw new Error("This driver does not support the required 'getScreenshot' command");
    }
    const settings = Object.assign({}, DEFAULT_SETTINGS, driver.settings.getSettings());
    const {fixImageFindScreenshotDims} = settings;

    const b64Screenshot = await driver.getScreenshot();

    // if the user has requested not to correct for aspect or size differences
    // between the screenshot and the screen, just return the screenshot now
    if (!fixImageFindScreenshotDims) {
      log.info(`Not verifying screenshot dimensions match screen`);
      return {b64Screenshot};
    }

    if (screenSize.width < 1 || screenSize.height < 1) {
      log.warn(
        `The retrieved screen size ${screenSize.width}x${screenSize.height} does ` +
        `not seem to be valid. No changes will be applied to the screenshot`
      );
      return {b64Screenshot};
    }

    // otherwise, do some verification on the screenshot to make sure it matches
    // the screen size and aspect ratio
    log.info('Verifying screenshot size and aspect ratio');

    let imgObj = await imageUtil.getJimpImage(b64Screenshot);
    let {width: shotWidth, height: shotHeight} = imgObj.bitmap;

    if (shotWidth < 1 || shotHeight < 1) {
      log.warn(
        `The retrieved screenshot size ${shotWidth}x${shotHeight} does ` +
        `not seem to be valid. No changes will be applied to the screenshot`
      );
      return {b64Screenshot};
    }

    if (screenSize.width === shotWidth && screenSize.height === shotHeight) {
      // the height and width of the screenshot and the device screen match, which
      // means we should be safe when doing template matches
      log.info('Screenshot size matched screen size');
      return {b64Screenshot};
    }

    // otherwise, if they don't match, it could spell problems for the accuracy
    // of coordinates returned by the image match algorithm, since we match based
    // on the screenshot coordinates not the device coordinates themselves. There
    // are two potential types of mismatch: aspect ratio mismatch and scale
    // mismatch. We need to detect and fix both

    const scale = {xScale: 1.0, yScale: 1.0};

    const screenAR = screenSize.width / screenSize.height;
    const shotAR = shotWidth / shotHeight;
    if (Math.round(screenAR * FLOAT_PRECISION) === Math.round(shotAR * FLOAT_PRECISION)) {
      log.info(
        `Screenshot aspect ratio '${shotAR}' (${shotWidth}x${shotHeight}) matched ` +
        `screen aspect ratio '${screenAR}' (${screenSize.width}x${screenSize.height})`
      );
    } else {
      log.warn(
        `When trying to find an element, determined that the screen ` +
        `aspect ratio and screenshot aspect ratio are different. Screen ` +
        `is ${screenSize.width}x${screenSize.height} whereas screenshot is ` +
        `${shotWidth}x${shotHeight}.`
      );

      // In the case where the x-scale and y-scale are different, we need to decide
      // which one to respect, otherwise the screenshot and template will end up
      // being resized in a way that changes its aspect ratio (distorts it). For example, let's say:
      // this.getScreenshot(shotWidth, shotHeight) is 540x397,
      // this.getDeviceSize(screenWidth, screenHeight) is 1080x1920.
      // The ratio would then be {xScale: 0.5, yScale: 0.2}.
      // In this case, we must should `yScale: 0.2` as scaleFactor, because
      // if we select the xScale, the height will be bigger than real screenshot size
      // which is used to image comparison by OpenCV as a base image.
      // All of this is primarily useful when the screenshot is a horizontal slice taken out of the
      // screen (for example not including top/bottom nav bars)
      const xScale = (1.0 * shotWidth) / screenSize.width;
      const yScale = (1.0 * shotHeight) / screenSize.height;
      const scaleFactor = xScale >= yScale ? yScale : xScale;

      log.warn(
        `Resizing screenshot to ${shotWidth * scaleFactor}x${shotHeight * scaleFactor} to match ` +
        `screen aspect ratio so that image element coordinates have a ` +
        `greater chance of being correct.`
      );
      imgObj = imgObj.resize(shotWidth * scaleFactor, shotHeight * scaleFactor);

      scale.xScale *= scaleFactor;
      scale.yScale *= scaleFactor;

      shotWidth = imgObj.bitmap.width;
      shotHeight = imgObj.bitmap.height;
    }

    // Resize based on the screen dimensions only if both width and height are mismatched
    // since except for that, it might be a situation which is different window rect and
    // screenshot size like `@driver.window_rect #=>x=0, y=0, width=1080, height=1794` and
    // `"deviceScreenSize"=>"1080x1920"`
    if (screenSize.width !== shotWidth && screenSize.height !== shotHeight) {
      log.info(
        `Scaling screenshot from ${shotWidth}x${shotHeight} to match ` +
        `screen at ${screenSize.width}x${screenSize.height}`
      );
      imgObj = imgObj.resize(screenSize.width, screenSize.height);

      scale.xScale *= (1.0 * screenSize.width) / shotWidth;
      scale.yScale *= (1.0 * screenSize.height) / shotHeight;
    }

    return {
      b64Screenshot: (await imgObj.getBuffer(imageUtil.MIME_PNG)).toString('base64'),
      scale,
    };
  }

  /**
   * @typedef ImageTemplateSettings
   * @property {boolean} fixImageTemplateScale - fixImageTemplateScale in device-settings
   * @property {number} defaultImageTemplateScale - defaultImageTemplateScale in device-settings
   * @property {boolean} ignoreDefaultImageTemplateScale - Ignore defaultImageTemplateScale if it has true.
   * If b64Template has been scaled to defaultImageTemplateScale or should ignore the scale,
   * this parameter should be true. e.g. click in image-element module
   * @property {number} xScale - Scale ratio for width
   * @property {number} yScale - Scale ratio for height

   */
  /**
   * Get a image that will be used for template maching.
   * Returns scaled image if scale ratio is provided.
   *
   *
   * @param {string} b64Template - base64-encoded image used as a template to be
   * matched in the screenshot
   * @param {ImageTemplateSettings} opts - Image template scale related options
   *
   * @returns {Promise<string>} base64-encoded scaled template screenshot
   */
  async fixImageTemplateScale(b64Template, opts) {
    if (!opts) {
      return b64Template;
    }

    let {
      fixImageTemplateScale = false,
      defaultImageTemplateScale = DEFAULT_TEMPLATE_IMAGE_SCALE,
      ignoreDefaultImageTemplateScale = false,
      xScale = DEFAULT_FIX_IMAGE_TEMPLATE_SCALE,
      yScale = DEFAULT_FIX_IMAGE_TEMPLATE_SCALE,
    } = opts;

    if (ignoreDefaultImageTemplateScale) {
      defaultImageTemplateScale = DEFAULT_TEMPLATE_IMAGE_SCALE;
    }

    // Default
    if (defaultImageTemplateScale === DEFAULT_TEMPLATE_IMAGE_SCALE && !fixImageTemplateScale) {
      return b64Template;
    }

    // Calculate xScale and yScale Appium should scale
    if (fixImageTemplateScale) {
      xScale *= defaultImageTemplateScale;
      yScale *= defaultImageTemplateScale;
    } else {
      xScale = yScale = 1 * defaultImageTemplateScale;
    }

    // xScale and yScale can be NaN if defaultImageTemplateScale is string, for example
    if (!parseFloat(String(xScale)) || !parseFloat(String(yScale))) {
      return b64Template;
    }

    // Return if the scale is default, 1, value
    if (
      Math.round(xScale * FLOAT_PRECISION) ===
        Math.round(DEFAULT_FIX_IMAGE_TEMPLATE_SCALE * FLOAT_PRECISION) &&
      Math.round(
        Number(
          yScale * FLOAT_PRECISION ===
            Math.round(DEFAULT_FIX_IMAGE_TEMPLATE_SCALE * FLOAT_PRECISION)
        )
      )
    ) {
      return b64Template;
    }

    let imgTempObj = await imageUtil.getJimpImage(b64Template);
    let {width: baseTempWidth, height: baseTempHeigh} = imgTempObj.bitmap;

    const scaledWidth = baseTempWidth * xScale;
    const scaledHeight = baseTempHeigh * yScale;
    log.info(
      `Scaling template image from ${baseTempWidth}x${baseTempHeigh}` +
        ` to ${scaledWidth}x${scaledHeight}`
    );
    log.info(`The ratio is ${xScale} and ${yScale}`);
    imgTempObj = await imgTempObj.resize(scaledWidth, scaledHeight);
    return (await imgTempObj.getBuffer(imageUtil.MIME_PNG)).toString('base64');
  }
}

/**
 * @typedef {import('@appium/types').ExternalDriver} ExternalDriver
 * @typedef {import('@appium/types').Element} Element
 */

/**
 * @typedef Screenshot
 * @property {string} b64Screenshot - base64 based screenshot string
 */

/**
 * @typedef ScreenshotScale
 * @property {number} xScale - Scale ratio for width
 * @property {number} yScale - Scale ratio for height
 */
