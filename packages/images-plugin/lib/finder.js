import _ from 'lodash';
import LRU from 'lru-cache';
import {errors} from 'appium/driver';
import {util, imageUtil} from 'appium/support';
import {
  ImageElement,
  DEFAULT_TEMPLATE_IMAGE_SCALE,
  IMAGE_EL_TAP_STRATEGY_W3C,
} from './image-element';
import {MATCH_TEMPLATE_MODE, compareImages, DEFAULT_MATCH_THRESHOLD} from './compare';
import log from './logger';

const {AppiumImage} = imageUtil;
const MJSONWP_ELEMENT_KEY = 'ELEMENT';
const W3C_ELEMENT_KEY = util.W3C_WEB_ELEMENT_IDENTIFIER;
const DEFAULT_FIX_IMAGE_TEMPLATE_SCALE = 1;
// Used to compare ratio and screen width
// Pixel is basically under 1080 for example. 100K is probably enough fo a while.
const FLOAT_PRECISION = 100000;
const MAX_CACHE_ITEMS = 100;
const MAX_CACHE_SIZE_BYTES = 1024 * 1024 * 40; // 40mb

const DEFAULT_SETTINGS = {
  // value between 0 and 1 representing match strength, below which an image
  // element will not be found
  imageMatchThreshold: DEFAULT_MATCH_THRESHOLD,

  // One of possible image matching methods.
  // Read https://docs.opencv.org/3.0-beta/doc/py_tutorials/py_imgproc/py_template_matching/py_template_matching.html
  // for more details.
  // TM_CCOEFF_NORMED by default
  imageMatchMethod: '',

  // if the image returned by getScreenshot differs in size or aspect ratio
  // from the screen, attempt to fix it automatically
  fixImageFindScreenshotDims: true,

  // whether Appium should ensure that an image template sent in during image
  // element find should have its size adjusted so the match algorithm will not
  // complain
  fixImageTemplateSize: false,

  // whether Appium should ensure that an image template sent in during image
  // element find should have its scale adjusted to display size so the match
  // algorithm will not complain.
  // e.g. iOS has `width=375, height=667` window rect, but its screenshot is
  //      `width=750 × height=1334` pixels. This setting help to adjust the scale
  //      if a user use `width=750 × height=1334` pixels's base template image.
  fixImageTemplateScale: false,

  // Users might have scaled template image to reduce their storage size.
  // This setting allows users to scale a template image they send to Appium server
  // so that the Appium server compares the actual scale users originally had.
  // e.g. If a user has an image of 270 x 32 pixels which was originally 1080 x 126 pixels,
  //      the user can set {defaultImageTemplateScale: 4.0} to scale the small image
  //      to the original one so that Appium can compare it as the original one.
  defaultImageTemplateScale: DEFAULT_TEMPLATE_IMAGE_SCALE,

  // whether Appium should re-check that an image element can be matched
  // against the current screenshot before clicking it
  checkForImageElementStaleness: true,

  // whether before clicking on an image element Appium should re-determine the
  // position of the element on screen
  autoUpdateImageElementPosition: false,

  // which method to use for tapping by coordinate for image elements. the
  // options are 'w3c' or 'mjsonwp'
  imageElementTapStrategy: IMAGE_EL_TAP_STRATEGY_W3C,

  // which method to use to save the matched image area in ImageElement class.
  // It is used for debugging purpose.
  getMatchedImageResult: false,
};

export class ImageElementFinder {
  /**
   * Can be set post-instantiation
   * @type {ExternalDriver|undefined}
   */
  driver;

  /** @type {LRU<string,ImageElement>} */
  imgElCache;

  /**
   *
   * @param {ExternalDriver} [driver]
   * @param {number} [maxSize]
   */
  constructor(driver, maxSize = MAX_CACHE_SIZE_BYTES) {
    this.driver = driver;
    this.imgElCache = new LRU({
      max: MAX_CACHE_ITEMS,
      maxSize,
      sizeCalculation: (el) => el.template.length,
    });
  }

  setDriver(driver) {
    this.driver = driver;
  }

  /**
   * @param {ImageElement} imgEl
   * @returns {Element}
   */
  registerImageElement(imgEl) {
    this.imgElCache.set(imgEl.id, imgEl);
    if (!this.driver) {
      throw new ReferenceError('No driver set!');
    }
    return imgEl.asElement();
  }

  /**
   * Find a screen rect represented by an ImageElement corresponding to an image
   * template sent in by the client
   *
   * @template {boolean} [Multiple=false]
   * @template {boolean} [CheckStaleness=false]
   * @param {string} b64Template - base64-encoded image used as a template to be
   * matched in the screenshot
   * @param {FindByImageOptions<Multiple,CheckStaleness>} opts - additional options
   * @returns {Promise<FindByImageResult<Multiple,CheckStaleness>>} - WebDriver element with a special id prefix
   */
  async findByImage(
    b64Template,
    {
      shouldCheckStaleness = /** @type {CheckStaleness} */ (false),
      multiple = /** @type {Multiple} */ (false),
      ignoreDefaultImageTemplateScale = false,
    }
  ) {
    if (!this.driver) {
      throw new Error(`Can't find without a driver!`);
    }
    const settings = {...DEFAULT_SETTINGS, ...this.driver.settings.getSettings()};
    const {
      imageMatchThreshold: threshold,
      imageMatchMethod,
      fixImageTemplateSize,
      fixImageTemplateScale,
      defaultImageTemplateScale,
      getMatchedImageResult: visualize,
    } = settings;

    log.info(`Finding image element with match threshold ${threshold}`);
    if (!this.driver.getWindowSize) {
      throw new Error("This driver does not support the required 'getWindowSize' command");
    }
    const {width: screenWidth, height: screenHeight} = await this.driver.getWindowSize();

    // someone might have sent in a template that's larger than the screen
    // dimensions. If so let's check and cut it down to size since the algorithm
    // will not work unless we do. But because it requires some potentially
    // expensive commands, only do this if the user has requested it in settings.
    if (fixImageTemplateSize) {
      b64Template = await this.ensureTemplateSize(b64Template, screenWidth, screenHeight);
    }

    const results = [];
    const condition = async () => {
      try {
        const {b64Screenshot, scale} = /** @type {Screenshot & {scale: ScreenshotScale}} */ (
          await this.getScreenshotForImageFind(screenWidth, screenHeight)
        );

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
        if (multiple) {
          results.push(
            .../** @type {import('@appium/opencv').OccurrenceResult[]} */ (
              await compareImages(MATCH_TEMPLATE_MODE, b64Screenshot, b64Template, comparisonOpts)
            )
          );
        } else {
          results.push(
            await compareImages(MATCH_TEMPLATE_MODE, b64Screenshot, b64Template, comparisonOpts)
          );
        }
        return true;
      } catch (err) {
        // if compareImages fails, we'll get a specific error, but we should
        // retry, so trap that and just return false to trigger the next round of
        // implicitly waiting. For other errors, throw them to get out of the
        // implicit wait loop
        if (err.message.match(/Cannot find any occurrences/)) {
          return false;
        }
        throw err;
      }
    };

    try {
      await this.driver.implicitWaitForCondition(condition);
    } catch (err) {
      // this `implicitWaitForCondition` method will throw a 'Condition unmet'
      // error if an element is not found eventually. In that case, we will
      // handle the element not found response below. In the case where get some
      // _other_ kind of error, it means something blew up totally apart from the
      // implicit wait timeout. We should not mask that error and instead throw
      // it straightaway
      if (!err.message.match(/Condition unmet/)) {
        throw err;
      }
    }

    if (_.isEmpty(results)) {
      if (multiple === true) {
        return /** @type {FindByImageResult<Multiple,CheckStaleness>} */ (
          /** @type {Element[]} */ ([])
        );
      }
      throw new errors.NoSuchElementError();
    }

    const elements = results.map(({rect, score, visualization}) => {
      log.info(`Image template matched: ${JSON.stringify(rect)}`);
      return new ImageElement(b64Template, rect, score, visualization, this);
    });

    // if we're just checking staleness, return straightaway so we don't add
    // a new element to the cache. shouldCheckStaleness does not support multiple
    // elements, since it is a purely internal mechanism
    if (shouldCheckStaleness) {
      return /** @type {FindByImageResult<Multiple,CheckStaleness>} */ (elements[0]);
    }

    const registeredElements = elements.map((imgEl) => this.registerImageElement(imgEl));

    return /** @type {FindByImageResult<Multiple,CheckStaleness>} */ (
      multiple ? registeredElements : registeredElements[0]
    );
  }

  /**
   * Ensure that the image template sent in for a find is of a suitable size
   *
   * @param {string} b64Template - base64-encoded image
   * @param {number} screenWidth - width of screen
   * @param {number} screenHeight - height of screen
   *
   * @returns {Promise<string>} base64-encoded image, potentially resized
   */
  async ensureTemplateSize(b64Template, screenWidth, screenHeight) {
    let imgObj = await AppiumImage.fromString(b64Template);
    let {width: tplWidth, height: tplHeight} = imgObj.bitmap;

    log.info(
      `Template image is ${tplWidth}x${tplHeight}. Screen size is ${screenWidth}x${screenHeight}`
    );
    // if the template fits inside the screen dimensions, we're good
    if (tplWidth <= screenWidth && tplHeight <= screenHeight) {
      return b64Template;
    }

    log.info(
      `Scaling template image from ${tplWidth}x${tplHeight} to match ` +
        `screen at ${screenWidth}x${screenHeight}`
    );
    // otherwise, scale it to fit inside the screen dimensions
    imgObj = imgObj.scaleToFit(screenWidth, screenHeight);
    return (await imgObj.getBuffer(imageUtil.MIME_PNG)).toString('base64');
  }

  /**
   * Get the screenshot image that will be used for find by element, potentially
   * altering it in various ways based on user-requested settings
   *
   * @param {number} screenWidth - width of screen
   * @param {number} screenHeight - height of screen
   *
   * @returns {Promise<Screenshot & {scale?: ScreenshotScale}>} base64-encoded screenshot and ScreenshotScale
   */
  async getScreenshotForImageFind(screenWidth, screenHeight) {
    if (!this.driver?.getScreenshot) {
      throw new Error("This driver does not support the required 'getScreenshot' command");
    }
    const settings = {...DEFAULT_SETTINGS, ...this.driver.settings.getSettings()};
    const {fixImageFindScreenshotDims} = settings;

    let b64Screenshot = await this.driver.getScreenshot();

    // if the user has requested not to correct for aspect or size differences
    // between the screenshot and the screen, just return the screenshot now
    if (!fixImageFindScreenshotDims) {
      log.info(`Not verifying screenshot dimensions match screen`);
      return {b64Screenshot};
    }

    if (screenWidth < 1 || screenHeight < 1) {
      log.warn(
        `The retrieved screen size ${screenWidth}x${screenHeight} does ` +
          `not seem to be valid. No changes will be applied to the screenshot`
      );
      return {b64Screenshot};
    }

    // otherwise, do some verification on the screenshot to make sure it matches
    // the screen size and aspect ratio
    log.info('Verifying screenshot size and aspect ratio');

    let imgObj = await AppiumImage.fromString(b64Screenshot);
    let {width: shotWidth, height: shotHeight} = imgObj.bitmap;

    if (shotWidth < 1 || shotHeight < 1) {
      log.warn(
        `The retrieved screenshot size ${shotWidth}x${shotHeight} does ` +
          `not seem to be valid. No changes will be applied to the screenshot`
      );
      return {b64Screenshot};
    }

    if (screenWidth === shotWidth && screenHeight === shotHeight) {
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

    const screenAR = screenWidth / screenHeight;
    const shotAR = shotWidth / shotHeight;
    if (Math.round(screenAR * FLOAT_PRECISION) === Math.round(shotAR * FLOAT_PRECISION)) {
      log.info(
        `Screenshot aspect ratio '${shotAR}' (${shotWidth}x${shotHeight}) matched ` +
          `screen aspect ratio '${screenAR}' (${screenWidth}x${screenHeight})`
      );
    } else {
      log.warn(
        `When trying to find an element, determined that the screen ` +
          `aspect ratio and screenshot aspect ratio are different. Screen ` +
          `is ${screenWidth}x${screenHeight} whereas screenshot is ` +
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
      const xScale = (1.0 * shotWidth) / screenWidth;
      const yScale = (1.0 * shotHeight) / screenHeight;
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
    if (screenWidth !== shotWidth && screenHeight !== shotHeight) {
      log.info(
        `Scaling screenshot from ${shotWidth}x${shotHeight} to match ` +
          `screen at ${screenWidth}x${screenHeight}`
      );
      imgObj = imgObj.resize(screenWidth, screenHeight);

      scale.xScale *= (1.0 * screenWidth) / shotWidth;
      scale.yScale *= (1.0 * screenHeight) / shotHeight;
    }

    b64Screenshot = (await imgObj.getBuffer(imageUtil.MIME_PNG)).toString('base64');
    return {b64Screenshot, scale};
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

    let imgTempObj = await AppiumImage.fromString(b64Template);
    let {width: baseTempWidth, height: baseTempHeigh} = imgTempObj.bitmap;

    const scaledWidth = baseTempWidth * xScale;
    const scaledHeight = baseTempHeigh * yScale;
    log.info(
      `Scaling template image from ${baseTempWidth}x${baseTempHeigh}` +
        ` to ${scaledWidth}x${scaledHeight}`
    );
    log.info(`The ratio is ${xScale} and ${yScale}`);
    imgTempObj = imgTempObj.resize(scaledWidth, scaledHeight);
    return (await imgTempObj.getBuffer(imageUtil.MIME_PNG)).toString('base64');
  }
}

export {W3C_ELEMENT_KEY, MJSONWP_ELEMENT_KEY, DEFAULT_SETTINGS, DEFAULT_FIX_IMAGE_TEMPLATE_SCALE};

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

/**
 * @template {boolean} [Multiple=false]
 * @template {boolean} [CheckStaleness=false]
 * @typedef FindByImageOptions
 * @property {CheckStaleness} [shouldCheckStaleness] - whether this call to find an
 * image is merely to check staleness. If so we can bypass a lot of logic
 * @property {Multiple} [multiple] - Whether we are finding one element or
 * multiple
 * @property {boolean} [ignoreDefaultImageTemplateScale] - Whether we
 * ignore defaultImageTemplateScale. It can be used when you would like to
 * scale b64Template with defaultImageTemplateScale setting.
 */

/**
 * @template {boolean} [Multiple=false]
 * @template {boolean} [CheckStaleness=false]
 * @typedef {Multiple extends true ? Element[] : CheckStaleness extends true ? ImageElement : Element} FindByImageResult
 */
