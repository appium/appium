import log from '../logger';
import { errors } from '../../..';
import { MATCH_TEMPLATE_MODE } from './images';
import { W3C_ELEMENT_KEY, MJSONWP_ELEMENT_KEY } from '../../protocol/protocol';
import { ImageElement } from '../image-element';
import { imageUtil } from 'appium-support';


const commands = {}, helpers = {}, extensions = {};

const IMAGE_STRATEGY = "-image";

// Override the following function for your own driver, and the rest is taken
// care of!

//helpers.findElOrEls = async function (strategy, selector, mult, context) {}
// strategy: locator strategy
// selector: the actual selector for finding an element
// mult: multiple elements or just one?
// context: finding an element from the root context? or starting from another element
//
// Returns an object which adheres to the way the JSON Wire Protocol represents elements:
// { ELEMENT: # }    eg: { ELEMENT: 3 }  or { ELEMENT: 1.023 }

helpers.findElOrElsWithProcessing = async function (strategy, selector, mult, context) {
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

commands.findElement = async function (strategy, selector) {
  if (strategy === IMAGE_STRATEGY) {
    return await this.findByImage(selector, {multiple: false});
  }

  return await this.findElOrElsWithProcessing(strategy, selector, false);
};

commands.findElements = async function (strategy, selector) {
  if (strategy === IMAGE_STRATEGY) {
    return await this.findByImage(selector, {multiple: true});
  }

  return await this.findElOrElsWithProcessing(strategy, selector, true);
};

commands.findElementFromElement = async function (strategy, selector, elementId) {
  return await this.findElOrElsWithProcessing(strategy, selector, false, elementId);
};

commands.findElementsFromElement = async function (strategy, selector, elementId) {
  return await this.findElOrElsWithProcessing(strategy, selector, true, elementId);
};

/**
 * @typedef {Object} FindByImageOptions
 * @property {boolean} [shouldCheckStaleness=false] - whether this call to find an
 * image is merely to check staleness. If so we can bypass a lot of logic
 * @property {boolean} [multiple=false] - Whether we are finding one element or
 * multiple
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
helpers.findByImage = async function (b64Template, {
  shouldCheckStaleness = false,
  multiple = false,
}) {
  const {
    imageMatchThreshold: threshold,
    fixImageTemplateSize
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
  const condition = async () => {
    try {
      let b64Screenshot = await this.getScreenshotForImageFind(screenWidth, screenHeight);
      rect = (await this.compareImages(MATCH_TEMPLATE_MODE, b64Screenshot,
        b64Template, {threshold})).rect;
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
  const imgEl = new ImageElement(b64Template, rect);

  // if we're just checking staleness, return straightaway so we don't add
  // a new element to the cache. shouldCheckStaleness does not support multiple
  // elements, since it is a purely internal mechanism
  if (shouldCheckStaleness) {
    return imgEl;
  }

  this._imgElCache.set(imgEl.id, imgEl);
  const protoKey = this.isW3CProtocol() ? W3C_ELEMENT_KEY : MJSONWP_ELEMENT_KEY;
  const protocolEl = imgEl.asElement(protoKey);
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
helpers.ensureTemplateSize = async function (b64Template, screenWidth, screenHeight) {
  let imgObj = await imageUtil.getJimpImage(b64Template);
  let {width: tplWidth, height: tplHeight} = imgObj.bitmap;

  // if the template fits inside the screen dimensions, we're good
  if (tplWidth <= screenWidth && tplHeight <= screenHeight) {
    return b64Template;
  }

  // otherwise, scale it to fit inside the screen dimensions
  imgObj = imgObj.scaleToFit(screenWidth, screenHeight);
  return (await imgObj.getBuffer(imageUtil.MIME_PNG)).toString('base64');
};

/**
 * Get the screenshot image that will be used for find by element, potentially
 * altering it in various ways based on user-requested settings
 *
 * @param {int} screenWidth - width of screen
 * @param {int} screenHeight - height of screen
 *
 * @returns {string} base64-encoded screenshot
 */
helpers.getScreenshotForImageFind = async function (screenWidth, screenHeight) {
  if (!this.getScreenshot) {
    throw new Error("This driver does not support the required 'getScreenshot' command");
  }

  let b64Screenshot = await this.getScreenshot();

  // if the user has requested not to correct for aspect or size differences
  // between the screenshot and the screen, just return the screenshot now
  if (!this.settings.getSettings().fixImageFindScreenshotDims) {
    log.info(`Not verifying screenshot dimensions match screen`);
    return b64Screenshot;
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
    return b64Screenshot;
  }

  // otherwise, if they don't match, it could spell problems for the accuracy
  // of coordinates returned by the image match algorithm, since we match based
  // on the screenshot coordinates not the device coordinates themselves. There
  // are two potential types of mismatch: aspect ratio mismatch and scale
  // mismatch. we need to detect and fix both

  const screenAR = screenWidth / screenHeight;
  const shotAR = shotWidth / shotHeight;

  if (screenAR === shotAR) {
    log.info('Screenshot aspect ratio matched screen aspect ratio');
  } else {
    log.warn(`When trying to find an element, determined that the screen ` +
             `aspect ratio and screenshot aspect ratio are different. Screen ` +
             `is ${screenWidth}x${screenHeight} whereas screenshot is ` +
             `${shotWidth}x${shotHeight}.`);
    shotWidth = shotWidth / (shotAR / screenAR);
    log.warn(`Resizing screenshot to ${shotWidth}x${shotHeight} to match ` +
             `screen aspect ratio so that image element coordinates have a ` +
             `greater chance of being correct.`);
    imgObj = imgObj.resize(shotWidth, shotHeight);
  }

  // now we know the aspect ratios match, but there might still be a scale
  // mismatch, so just resize based on the screen dimensions
  if (screenWidth !== shotWidth) {
    log.info(`Scaling screenshot from ${shotWidth}x${shotHeight} to match ` +
             `screen at ${screenWidth}x${screenHeight}`);
    imgObj = imgObj.resize(screenWidth, screenHeight);
  }

  return (await imgObj.getBuffer(imageUtil.MIME_PNG)).toString('base64');
};


Object.assign(extensions, commands, helpers);
export { commands, helpers, IMAGE_STRATEGY };
export default extensions;
