import _ from 'lodash';
import {LRUCache} from 'lru-cache';
import {errors} from 'appium/driver';
import {ImageElement} from './image-element';
import {compareImages} from './compare';
import log from './logger';
import {
  DEFAULT_SETTINGS, MATCH_TEMPLATE_MODE, DEFAULT_TEMPLATE_IMAGE_SCALE,
  DEFAULT_FIX_IMAGE_TEMPLATE_SCALE,
} from './constants';
import sharp from 'sharp';

// Used to compare ratio and screen width
// Pixel is basically under 1080 for example. 100K is probably enough fo a while.
const FLOAT_PRECISION = 100000;
const MAX_CACHE_ITEMS = 100;
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

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
  /** @type {LRUCache<string,ImageElement>} */
  _imgElCache;

  /**
   * @param {number} max
   */
  constructor(max = MAX_CACHE_ITEMS) {
    this._imgElCache = new LRUCache({
      ttl: MAX_CACHE_AGE_MS,
      updateAgeOnGet: true,
      max,
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

  clearImageElements() {
    this._imgElCache.clear();
  }

  /**
   * @typedef FindByImageOptions
   * @property {boolean} [shouldCheckStaleness=false] - whether this call to find an
   * image is merely to check staleness. If so we can bypass a lot of logic
   * @property {boolean} [multiple=false] - Whether we are finding one element or
   * multiple
   * @property {boolean} [ignoreDefaultImageTemplateScale=false] - Whether we
   * ignore defaultImageTemplateScale. It can be used when you would like to
   * scale template with defaultImageTemplateScale setting.
   * @property {import('@appium/types').Rect?} [containerRect=null] - The bounding
   * rectangle to limit the search in
   */

  /**
   * Find a screen rect represented by an ImageElement corresponding to an image
   * template sent in by the client
   *
   * @param {Buffer} template - image used as a template to be
   * matched in the screenshot
   * @param {ExternalDriver} driver
   * @param {FindByImageOptions} opts - additional options
   *
   * @returns {Promise<Element|Element[]|ImageElement>} - WebDriver element with a special id prefix
   */
  async findByImage(
    template,
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
    if (!driver.getWindowRect && !_.has(driver, 'getWindowSize')) {
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
      // @ts-ignore TODO: Drop the deprecated endpoint
      screenSize = await driver.getWindowSize();
    }

    // someone might have sent in a template that's larger than the screen
    // dimensions. If so let's check and cut it down to size since the algorithm
    // will not work unless we do. But because it requires some potentially
    // expensive commands, only do this if the user has requested it in settings.
    if (fixImageTemplateSize) {
      template = await this.ensureTemplateSize(template, {
        width: containerRect ? containerRect.width : screenSize.width,
        height: containerRect ? containerRect.height : screenSize.height,
      });
    }

    const results = [];
    let didFixTemplateImageScale = false;
    const performLookup = async () => {
      try {

        const {screenshot, scale} = await this.getScreenshotForImageFind(driver, screenSize);

        if (!didFixTemplateImageScale) {
          template = await this.fixImageTemplateScale(template, {
            defaultImageTemplateScale,
            ignoreDefaultImageTemplateScale,
            fixImageTemplateScale,
            ...(scale || {}),
          });
          // We do not want `template` to be mutated multiple times when the
          // wrapping lambda is retried
          didFixTemplateImageScale = true;
        }

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

        const elOrEls = await compareImages(
          MATCH_TEMPLATE_MODE, screenshot, template, comparisonOpts
        );
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
      await driver.implicitWaitForCondition(performLookup);
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
        template,
        rect,
        score,
        match: visualization ? Buffer.from(visualization, 'base64') : null,
        finder: this,
        containerRect,
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
   * @param {Buffer} template - template image
   * @param {import('@appium/types').Size} maxSize - size of the bounding rectangle
   *
   * @returns {Promise<Buffer>} image, potentially resized
   */
  async ensureTemplateSize(template, maxSize) {
    const imgObj = sharp(template);
    const {width: tplWidth, height: tplHeight} = await imgObj.metadata();
    if (_.isNil(tplWidth) || _.isNil(tplHeight)) {
      throw new Error(`Template width/height cannot be determined. Is it a valid image?`);
    }

    log.info(
      `Template image is ${tplWidth}x${tplHeight}. Bounding rectangle size is ${maxSize.width}x${maxSize.height}`
    );
    // if the template fits inside the screen dimensions, we're good
    if (tplWidth <= maxSize.width && tplHeight <= maxSize.height) {
      return template;
    }

    log.info(
      `Scaling template image from ${tplWidth}x${tplHeight} to match ` +
      `the bounding rectangle at ${maxSize.width}x${maxSize.height}`
    );
    // otherwise, scale it to fit inside the bounding rectangle dimensions:
    // https://sharp.pixelplumbing.com/api-resize
    return await imgObj.resize({
      width: Math.trunc(maxSize.width),
      height: Math.trunc(maxSize.height),
      fit: 'inside',
    })
    .toBuffer();
  }

  /**
   * Get the screenshot image that will be used for find by element, potentially
   * altering it in various ways based on user-requested settings
   *
   * @param {ExternalDriver} driver
   * @param {import('@appium/types').Size} screenSize - The original size of the screen
   *
   * @returns {Promise<Screenshot & {scale?: ScreenshotScale}>} PNG screenshot and ScreenshotScale
   */
  async getScreenshotForImageFind(driver, screenSize) {
    if (!driver.getScreenshot) {
      throw new Error("This driver does not support the required 'getScreenshot' command");
    }
    const settings = Object.assign({}, DEFAULT_SETTINGS, driver.settings.getSettings());
    const {fixImageFindScreenshotDims} = settings;

    const screenshot = Buffer.from(await driver.getScreenshot(), 'base64');

    // if the user has requested not to correct for aspect or size differences
    // between the screenshot and the screen, just return the screenshot now
    if (!fixImageFindScreenshotDims) {
      log.info(`Not verifying screenshot dimensions match screen`);
      return {screenshot};
    }

    if (screenSize.width < 1 || screenSize.height < 1) {
      log.warn(
        `The retrieved screen size ${screenSize.width}x${screenSize.height} does ` +
        `not seem to be valid. No changes will be applied to the screenshot`
      );
      return {screenshot};
    }

    // otherwise, do some verification on the screenshot to make sure it matches
    // the screen size and aspect ratio
    log.info('Verifying screenshot size and aspect ratio');

    let imgObj = sharp(screenshot);
    let {width: shotWidth, height: shotHeight} = await imgObj.metadata();

    if (!shotWidth || shotWidth < 1 || !shotHeight || shotHeight < 1) {
      log.warn(
        `The retrieved screenshot size ${shotWidth}x${shotHeight} does ` +
        `not seem to be valid. No changes will be applied to the screenshot`
      );
      return {screenshot};
    }

    if (screenSize.width === shotWidth && screenSize.height === shotHeight) {
      // the height and width of the screenshot and the device screen match, which
      // means we should be safe when doing template matches
      log.info('Screenshot size matched screen size');
      return {screenshot};
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
      // In this case, we must use `yScale: 0.2` as scaleFactor, because
      // if we select the xScale, the height will be bigger than real screenshot size
      // which is used to image comparison by OpenCV as a base image.
      // All of this is primarily useful when the screenshot is a horizontal slice taken out of the
      // screen (for example not including top/bottom nav bars)
      const xScale = (1.0 * shotWidth) / screenSize.width;
      const yScale = (1.0 * shotHeight) / screenSize.height;
      const scaleFactor = Math.min(xScale, yScale);
      const [newWidth, newHeight] = [shotWidth * scaleFactor, shotHeight * scaleFactor]
        .map(Math.trunc);

      log.warn(
        `Resizing screenshot to ${newWidth}x${newHeight} to match ` +
        `screen aspect ratio so that image element coordinates have a ` +
        `greater chance of being correct.`
      );
      imgObj = imgObj.resize({
        width: newWidth,
        height: newHeight,
        fit: 'fill',
      });

      scale.xScale *= scaleFactor;
      scale.yScale *= scaleFactor;
      [shotWidth, shotHeight] = [newWidth, newHeight];
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
      imgObj = imgObj.resize({
        width: Math.trunc(screenSize.width),
        height: Math.trunc(screenSize.height),
        fit: 'fill',
      });

      scale.xScale *= (1.0 * screenSize.width) / shotWidth;
      scale.yScale *= (1.0 * screenSize.height) / shotHeight;
    }

    return {
      screenshot: await imgObj.toBuffer(),
      scale,
    };
  }

  /**
   * @typedef ImageTemplateSettings
   * @property {boolean} [fixImageTemplateScale=false] - fixImageTemplateScale in device-settings
   * @property {number} [defaultImageTemplateScale=DEFAULT_TEMPLATE_IMAGE_SCALE] - defaultImageTemplateScale in device-settings
   * @property {boolean} [ignoreDefaultImageTemplateScale=false] - Ignore defaultImageTemplateScale if it has true.
   * If the template has been scaled to defaultImageTemplateScale or should ignore the scale,
   * this parameter should be true. e.g. click in image-element module
   * @property {number} [xScale=DEFAULT_FIX_IMAGE_TEMPLATE_SCALE] - Scale ratio for width
   * @property {number} [yScale=DEFAULT_FIX_IMAGE_TEMPLATE_SCALE] - Scale ratio for height

   */
  /**
   * Get a image that will be used for template maching.
   * Returns scaled image if scale ratio is provided.
   *
   * @param {Buffer} template - image used as a template to be
   * matched in the screenshot
   * @param {ImageTemplateSettings} opts - Image template scale related options
   *
   * @returns {Promise<Buffer>} scaled template screenshot
   */
  async fixImageTemplateScale(template, opts) {
    if (!opts) {
      return template;
    }

    let {
      fixImageTemplateScale: fixTplScale = false,
      defaultImageTemplateScale = DEFAULT_TEMPLATE_IMAGE_SCALE,
      ignoreDefaultImageTemplateScale = false,
      xScale = DEFAULT_FIX_IMAGE_TEMPLATE_SCALE,
      yScale = DEFAULT_FIX_IMAGE_TEMPLATE_SCALE,
    } = opts;

    if (ignoreDefaultImageTemplateScale) {
      defaultImageTemplateScale = DEFAULT_TEMPLATE_IMAGE_SCALE;
    }

    // Default
    if (defaultImageTemplateScale === DEFAULT_TEMPLATE_IMAGE_SCALE && !fixTplScale) {
      return template;
    }

    // Calculate xScale and yScale Appium should scale
    if (fixTplScale) {
      xScale *= defaultImageTemplateScale;
      yScale *= defaultImageTemplateScale;
    } else {
      xScale = yScale = 1 * defaultImageTemplateScale;
    }

    // xScale and yScale can be NaN if defaultImageTemplateScale is string, for example
    if (!parseFloat(String(xScale)) || !parseFloat(String(yScale))) {
      return template;
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
      return template;
    }

    let imgObj = sharp(template);
    const {width: baseTempWidth, height: baseTempHeigh} = await imgObj.metadata();
    if (_.isNil(baseTempWidth) || _.isNil(baseTempHeigh)) {
      throw new Error(`Template width/height cannot be determined. Is it a valid image?`);
    }

    const scaledWidth = baseTempWidth * xScale;
    const scaledHeight = baseTempHeigh * yScale;
    log.info(
      `Scaling template image from ${baseTempWidth}x${baseTempHeigh} to ${scaledWidth}x${scaledHeight}`
    );
    log.info(`The ratio is ${xScale} and ${yScale}`);
    imgObj = imgObj.resize({
      width: Math.trunc(scaledWidth),
      height: Math.trunc(scaledHeight),
      fit: 'fill',
    });
    return await imgObj.toBuffer();
  }
}

/**
 * @typedef {import('@appium/types').ExternalDriver} ExternalDriver
 * @typedef {import('@appium/types').Element} Element
 */

/**
 * @typedef Screenshot
 * @property {Buffer} screenshot - screenshot image as PNG
 */

/**
 * @typedef ScreenshotScale
 * @property {number} xScale - Scale ratio for width
 * @property {number} yScale - Scale ratio for height
 */
