import log from '../logger';
import { logger, imageUtil } from 'appium-support';
import _ from 'lodash';
import { errors } from '../../..';
import { MATCH_TEMPLATE_MODE } from './images';
import { ImageElement, DEFAULT_TEMPLATE_IMAGE_SCALE } from '../image-element';


const commands = {}, helpers = {}, extensions = {};

const IMAGE_STRATEGY = '-image';
const CUSTOM_STRATEGY = '-custom';

// Used to compare ratio and screen width
// Pixel is basically under 1080 for example. 100K is probably enough fo a while.
const FLOAT_PRECISION = 100000;

// Override the following function for your own driver, and the rest is taken
// care of!

// helpers.findElOrEls = async function (strategy, selector, mult, context) {}
//   strategy: locator strategy
//   selector: the actual selector for finding an element
//   mult: multiple elements or just one?
//   context: finding an element from the root context? or starting from another element
//
// Returns an object which adheres to the way the JSON Wire Protocol represents elements:
// { ELEMENT: # }    eg: { ELEMENT: 3 }  or { ELEMENT: 1.023 }

helpers.findElOrElsWithProcessing = async function findElOrElsWithProcessing (strategy, selector, mult, context) {
  this.validateLocatorStrategy(strategy);
  try {
    return await this.findElOrEls(strategy, selector, mult, context);
  } catch (err) {
    if (this.opts.printPageSourceOnFindFailure) {
      const src = await this.getPageSource();
      log.debug(`Error finding element${mult ? 's' : ''}: ${err.message}`);
      log.debug(`Page source requested through 'printPageSourceOnFindFailure':`);
      log.debug(src);
    }
    // still want the error to occur
    throw err;
  }
};

commands.findElement = async function findElement (strategy, selector) {
  if (strategy === IMAGE_STRATEGY) {
    return await this.findByImage(selector, {multiple: false});
  } else if (strategy === CUSTOM_STRATEGY) {
    return await this.findByCustom(selector, false);
  }

  return await this.findElOrElsWithProcessing(strategy, selector, false);
};

commands.findElements = async function findElements (strategy, selector) {
  if (strategy === IMAGE_STRATEGY) {
    return await this.findByImage(selector, {multiple: true});
  } else if (strategy === CUSTOM_STRATEGY) {
    return await this.findByCustom(selector, true);
  }

  return await this.findElOrElsWithProcessing(strategy, selector, true);
};

commands.findElementFromElement = async function findElementFromElement (strategy, selector, elementId) {
  return await this.findElOrElsWithProcessing(strategy, selector, false, elementId);
};

commands.findElementsFromElement = async function findElementsFromElement (strategy, selector, elementId) {
  return await this.findElOrElsWithProcessing(strategy, selector, true, elementId);
};

/**
 * Find an element using a custom plugin specified by the customFindModules cap.
 *
 * @param {string} selector - the selector which the plugin will use to find
 * elements
 * @param {boolean} multiple - whether we want one element or multiple
 *
 * @returns {WebElement} - WebDriver element or list of elements
 */
commands.findByCustom = async function findByCustom (selector, multiple) {
  const plugins = this.opts.customFindModules;

  // first ensure the user has registered one or more find plugins
  if (!plugins) {
    // TODO this info should go in docs instead; update when docs for this
    // feature exist
    throw new Error('Finding an element using a plugin is currently an ' +
      'incubating feature. To use it you must manually install one or more ' +
      'plugin modules in a way that they can be required by Appium, for ' +
      'example installing them from the Appium directory, installing them ' +
      'globally, or installing them elsewhere and passing an absolute path as ' +
      'the capability. Then construct an object where the key is the shortcut ' +
      'name for this plugin and the value is the module name or absolute path, ' +
      'for example: {"p1": "my-find-plugin"}, and pass this in as the ' +
      "'customFindModules' capability.");
  }

  // then do some basic checking of the type of the capability
  if (!_.isPlainObject(plugins)) {
    throw new Error("Invalid format for the 'customFindModules' capability. " +
      'It should be an object with keys corresponding to the short names and ' +
      'values corresponding to the full names of the element finding plugins');
  }

  // get the name of the particular plugin used for this invocation of find,
  // and separate it from the selector we will pass to the plugin
  let [plugin, realSelector] = selector.split(':');

  // if the user didn't specify a plugin for this find invocation, and we had
  // multiple plugins registered, that's a problem
  if (_.size(plugins) > 1 && !realSelector) {
    throw new Error(`Multiple element finding plugins were registered ` +
      `(${_.keys(plugins)}), but your selector did not indicate which plugin ` +
      `to use. Ensure you put the short name of the plugin followed by ':' as ` +
      `the initial part of the selector string.`);
  }

  // but if they did not specify a plugin and we only have one plugin, just use
  // that one
  if (_.size(plugins) === 1 && !realSelector) {
    realSelector = plugin;
    plugin = _.keys(plugins)[0];
  }

  if (!plugins[plugin]) {
    throw new Error(`Selector specified use of element finding plugin ` +
      `'${plugin}' but it was not registered in the 'customFindModules' ` +
      `capability.`);
  }

  let finder;
  try {
    log.debug(`Find plugin '${plugin}' requested; will attempt to use it ` +
      `from '${plugins[plugin]}'`);
    finder = require(plugins[plugin]);
  } catch (err) {
    throw new Error(`Could not load your custom find module '${plugin}'. Did ` +
      `you put it somewhere Appium can 'require' it? Original error: ${err}`);
  }

  if (!finder || !_.isFunction(finder.find)) {
    throw new Error('Your custom find module did not appear to be constructed ' +
        'correctly. It needs to export an object with a `find` method.');
  }

  const customFinderLog = logger.getLogger(plugin);

  let elements;
  const condition = async () => {
    // get a list of matched elements from the custom finder, which can
    // potentially use the entire suite of methods the current driver provides.
    // the finder should always return a list of elements, but may use the
    // knowledge of whether we are looking for one or many to perform internal
    // optimizations
    elements = await finder.find(this, customFinderLog, realSelector, multiple);

    // if we're looking for multiple elements, or if we're looking for only
    // one and found it, we're done
    if (!_.isEmpty(elements) || multiple) {
      return true;
    }

    // otherwise we should retry, so return false to trigger the retry loop
    return false;
  };

  try {
    // make sure we respect implicit wait
    await this.implicitWaitForCondition(condition);
  } catch (err) {
    if (err.message.match(/Condition unmet/)) {
      throw new errors.NoSuchElementError();
    }
    throw err;
  }

  return multiple ? elements : elements[0];
};

/**
 * @typedef {Object} FindByImageOptions
 * @property {boolean} [shouldCheckStaleness=false] - whether this call to find an
 * image is merely to check staleness. If so we can bypass a lot of logic
 * @property {boolean} [multiple=false] - Whether we are finding one element or
 * multiple
 * @property {boolean} [ignoreDefaultImageTemplateScale=false] - Whether we
 * ignore defaultImageTemplateScale. It can be used when you would like to
 * scale b64Template with defaultImageTemplateScale setting.
 */

/**
 * Find a screen rect represented by an ImageElement corresponding to an image
 * template sent in by the client
 *
 * @param {string} b64Template - base64-encoded image used as a template to be
 * matched in the screenshot
 * @param {FindByImageOptions} - additional options
 *
 * @returns {WebElement} - WebDriver element with a special id prefix
 */
helpers.findByImage = async function findByImage (b64Template, {
  shouldCheckStaleness = false,
  multiple = false,
  ignoreDefaultImageTemplateScale = false,
}) {
  const {
    imageMatchThreshold: threshold,
    fixImageTemplateSize,
    fixImageTemplateScale,
    defaultImageTemplateScale,
    getMatchedImageResult: visualize
  } = this.settings.getSettings();

  log.info(`Finding image element with match threshold ${threshold}`);
  if (!this.getWindowSize) {
    throw new Error("This driver does not support the required 'getWindowSize' command");
  }
  const {width: screenWidth, height: screenHeight} = await this.getWindowSize();

  // someone might have sent in a template that's larger than the screen
  // dimensions. If so let's check and cut it down to size since the algorithm
  // will not work unless we do. But because it requires some potentially
  // expensive commands, only do this if the user has requested it in settings.
  if (fixImageTemplateSize) {
    b64Template = await this.ensureTemplateSize(b64Template, screenWidth,
      screenHeight);
  }

  let rect = null;
  let b64Matched = null;
  const condition = async () => {
    try {
      const {b64Screenshot, scale} = await this.getScreenshotForImageFind(screenWidth, screenHeight);

      b64Template = await this.fixImageTemplateScale(b64Template, {
        defaultImageTemplateScale, ignoreDefaultImageTemplateScale,
        fixImageTemplateScale, ...scale
      });

      const comparedImage = await this.compareImages(MATCH_TEMPLATE_MODE, b64Screenshot, b64Template, {threshold, visualize});
      rect = comparedImage.rect;
      b64Matched = comparedImage.visualization;

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
    await this.implicitWaitForCondition(condition);
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

  if (!rect) {
    if (multiple) {
      return [];
    }
    throw new errors.NoSuchElementError();
  }

  log.info(`Image template matched: ${JSON.stringify(rect)}`);
  if (b64Matched) {
    log.info(`Matched base64 data: ${b64Matched.substring(0, 200)}...`);
  }
  const imgEl = new ImageElement(b64Template, rect, b64Matched);

  // if we're just checking staleness, return straightaway so we don't add
  // a new element to the cache. shouldCheckStaleness does not support multiple
  // elements, since it is a purely internal mechanism
  if (shouldCheckStaleness) {
    return imgEl;
  }

  const protocolEl = this.registerImageElement(imgEl);

  return multiple ? [protocolEl] : protocolEl;
};

/**
 * Ensure that the image template sent in for a find is of a suitable size
 *
 * @param {string} b64Template - base64-encoded image
 * @param {int} screenWidth - width of screen
 * @param {int} screenHeight - height of screen
 *
 * @returns {string} base64-encoded image, potentially resized
 */
helpers.ensureTemplateSize = async function ensureTemplateSize (b64Template, screenWidth, screenHeight) {
  let imgObj = await imageUtil.getJimpImage(b64Template);
  let {width: tplWidth, height: tplHeight} = imgObj.bitmap;

  log.info(`Template image is ${tplWidth}x${tplHeight}. Screen size is ${screenWidth}x${screenHeight}`);
  // if the template fits inside the screen dimensions, we're good
  if (tplWidth <= screenWidth && tplHeight <= screenHeight) {
    return b64Template;
  }

  log.info(`Scaling template image from ${tplWidth}x${tplHeight} to match ` +
           `screen at ${screenWidth}x${screenHeight}`);
  // otherwise, scale it to fit inside the screen dimensions
  imgObj = imgObj.scaleToFit(screenWidth, screenHeight);
  return (await imgObj.getBuffer(imageUtil.MIME_PNG)).toString('base64');
};

/**
 * @typedef {Object} Screenshot
 * @property {string} b64Screenshot - base64 based screenshot string
 */
/**
 * @typedef {Object} ScreenshotScale
 * @property {float} xScale - Scale ratio for width
 * @property {float} yScale - Scale ratio for height
 */
/**
 * Get the screenshot image that will be used for find by element, potentially
 * altering it in various ways based on user-requested settings
 *
 * @param {int} screenWidth - width of screen
 * @param {int} screenHeight - height of screen
 *
 * @returns {Screenshot, ?ScreenshotScale} base64-encoded screenshot and ScreenshotScale
 */
helpers.getScreenshotForImageFind = async function getScreenshotForImageFind (screenWidth, screenHeight) {
  if (!this.getScreenshot) {
    throw new Error("This driver does not support the required 'getScreenshot' command");
  }

  let b64Screenshot = await this.getScreenshot();

  // if the user has requested not to correct for aspect or size differences
  // between the screenshot and the screen, just return the screenshot now
  if (!this.settings.getSettings().fixImageFindScreenshotDims) {
    log.info(`Not verifying screenshot dimensions match screen`);
    return {b64Screenshot};
  }

  // otherwise, do some verification on the screenshot to make sure it matches
  // the screen size and aspect ratio
  log.info('Verifying screenshot size and aspect ratio');

  let imgObj = await imageUtil.getJimpImage(b64Screenshot);
  let {width: shotWidth, height: shotHeight} = imgObj.bitmap;

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
    log.info(`Screenshot aspect ratio '${shotAR}' (${shotWidth}x${shotHeight}) matched ` +
      `screen aspect ratio '${screenAR}' (${screenWidth}x${screenHeight})`);
  } else {
    log.warn(`When trying to find an element, determined that the screen ` +
             `aspect ratio and screenshot aspect ratio are different. Screen ` +
             `is ${screenWidth}x${screenHeight} whereas screenshot is ` +
             `${shotWidth}x${shotHeight}.`);

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

    log.warn(`Resizing screenshot to ${shotWidth * scaleFactor}x${shotHeight * scaleFactor} to match ` +
             `screen aspect ratio so that image element coordinates have a ` +
             `greater chance of being correct.`);
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
    log.info(`Scaling screenshot from ${shotWidth}x${shotHeight} to match ` +
             `screen at ${screenWidth}x${screenHeight}`);
    imgObj = imgObj.resize(screenWidth, screenHeight);

    scale.xScale *= (1.0 * screenWidth) / shotWidth;
    scale.yScale *= (1.0 * screenHeight) / shotHeight;
  }

  b64Screenshot = (await imgObj.getBuffer(imageUtil.MIME_PNG)).toString('base64');
  return {b64Screenshot, scale};
};

/**
 * @typedef {Object} ImageTemplateSettings
 * @property {boolean} fixImageTemplateScale - fixImageTemplateScale in device-settings
 * @property {float} defaultImageTemplateScale - defaultImageTemplateScale in device-settings
 * @property {boolean} ignoreDefaultImageTemplateScale - Ignore defaultImageTemplateScale if it has true.
 * If b64Template has been scaled to defaultImageTemplateScale or should ignore the scale,
 * this parameter should be true. e.g. click in image-element module
 * @property {float} xScale - Scale ratio for width
 * @property {float} yScale - Scale ratio for height

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
 * @returns {string} base64-encoded scaled template screenshot
 */
const DEFAULT_FIX_IMAGE_TEMPLATE_SCALE = 1;
helpers.fixImageTemplateScale = async function fixImageTemplateScale (b64Template, opts = {}) {
  if (!opts) {
    return b64Template;
  }

  let {
    fixImageTemplateScale = false,
    defaultImageTemplateScale = DEFAULT_TEMPLATE_IMAGE_SCALE,
    ignoreDefaultImageTemplateScale = false,
    xScale = DEFAULT_FIX_IMAGE_TEMPLATE_SCALE,
    yScale = DEFAULT_FIX_IMAGE_TEMPLATE_SCALE
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
  if (!parseFloat(xScale) || !parseFloat(yScale)) {
    return b64Template;
  }

  // Return if the scale is default, 1, value
  if (Math.round(xScale * FLOAT_PRECISION) === Math.round(DEFAULT_FIX_IMAGE_TEMPLATE_SCALE * FLOAT_PRECISION)
      && Math.round(yScale * FLOAT_PRECISION === Math.round(DEFAULT_FIX_IMAGE_TEMPLATE_SCALE * FLOAT_PRECISION))) {
    return b64Template;
  }

  let imgTempObj = await imageUtil.getJimpImage(b64Template);
  let {width: baseTempWidth, height: baseTempHeigh} = imgTempObj.bitmap;

  const scaledWidth = baseTempWidth * xScale;
  const scaledHeight = baseTempHeigh * yScale;
  log.info(`Scaling template image from ${baseTempWidth}x${baseTempHeigh}` +
            ` to ${scaledWidth}x${scaledHeight}`);
  log.info(`The ratio is ${xScale} and ${yScale}`);
  imgTempObj = await imgTempObj.resize(scaledWidth, scaledHeight);
  return (await imgTempObj.getBuffer(imageUtil.MIME_PNG)).toString('base64');
};

Object.assign(extensions, commands, helpers);
export { commands, helpers, IMAGE_STRATEGY, CUSTOM_STRATEGY };
export default extensions;
