import _ from 'lodash';
import {errors} from 'appium/driver';
import {util} from '@appium/support';
import log from './logger';
import {
  IMAGE_STRATEGY, DEFAULT_SETTINGS, IMAGE_TAP_STRATEGIES,
  IMAGE_ELEMENT_PREFIX, IMAGE_EL_TAP_STRATEGY_W3C,
} from './constants';

const TAP_DURATION_MS = 125;

/**
 * @typedef Dimension
 * @property {number} width - width of rect
 * @property {number} height - height of rect
 */

/**
 * @typedef Position
 * @property {number} x - x coordinate
 * @property {number} y - y coordinate
 */

/**
 * @typedef ImageElementOpts
 * @property {Buffer} template - the image which was used to find this ImageElement
 * @property {Rect} rect - bounds of matched image element
 * @property {number} score The similarity score as a float number in range [0.0, 1.0].
 * 1.0 is the highest score (means both images are totally equal).
 * @property {Buffer?} match - the image which has matched marks. Defaults to null.
 * @property {import('./finder').default?} finder - the finder we can use to re-check stale elements
 * @property {import('@appium/types').Rect?} containerRect - The bounding
 * rectangle to limit the search in
 */

/**
 * Representation of an "image element", which is simply a set of coordinates
 * and methods that can be used on that set of coordinates via the driver
 */
export default class ImageElement {
  /**
   * @param {ImageElementOpts} options
   */
  constructor({
    template,
    rect,
    score,
    match = null,
    finder = null,
    containerRect = null,
  }) {
    this.template = template;
    this.rect = rect;
    this.id = `${IMAGE_ELEMENT_PREFIX}${util.uuidV4()}`;
    this.match = match;
    this.score = score;
    this.finder = finder;
    this.containerRect = containerRect;
  }

  /**
   * @returns {Dimension} - dimension of element
   */
  get size() {
    return {width: this.rect.width, height: this.rect.height};
  }

  /**
   * @returns {Position} - coordinates of top-left corner of element
   */
  get location() {
    return {x: this.rect.x, y: this.rect.y};
  }

  /**
   * @returns {Position} - coordinates of center of element
   */
  get center() {
    return {
      x: this.rect.x + this.rect.width / 2,
      y: this.rect.y + this.rect.height / 2,
    };
  }

  /**
   * @returns {string} - the base64-encoded original image used for matching
   */
  get originalImage() {
    return this.template.toString('base64');
  }

  /**
   * @returns {string|null} - the base64-encoded image which has matched marks
   */
  get matchedImage() {
    return this.match?.toString('base64') ?? null;
  }

  /**
   *
   * @returns {Element} - this image element as a WebElement
   */
  asElement() {
    return util.wrapElement(this.id);
  }

  /**
   * @param {ImageElement} other - an ImageElement to compare with this one
   *
   * @returns {boolean} - whether the other element and this one have the same
   * properties
   */
  equals(other) {
    return (
      this.rect.x === other.rect.x &&
      this.rect.y === other.rect.y &&
      this.rect.width === other.rect.width &&
      this.rect.height === other.rect.height
    );
  }

  /**
   * Use a driver to tap the screen at the center of this ImageElement's
   * position
   *
   * @param {import('appium/driver').BaseDriver} driver - driver for calling actions with
   */
  async click(driver) {
    // before we click we need to make sure the element is actually still there
    // where we expect it to be
    const settings = Object.assign({}, DEFAULT_SETTINGS, driver.settings.getSettings());
    const {
      autoUpdateImageElementPosition: updatePos,
      checkForImageElementStaleness,
      imageElementTapStrategy,
    } = settings;

    // validate tap strategy
    if (!IMAGE_TAP_STRATEGIES.includes(imageElementTapStrategy)) {
      throw new Error(
        `Incorrect imageElementTapStrategy setting ` +
          `'${imageElementTapStrategy}'. Must be one of ` +
          JSON.stringify(IMAGE_TAP_STRATEGIES)
      );
    }

    let newImgEl;
    if (checkForImageElementStaleness || updatePos) {
      log.info('Checking image element for staleness before clicking');
      try {
        newImgEl = /** @type {ImageElement} */ (await (/** @type {import('./finder').default} */ (this.finder))
          .findByImage(
            this.template, driver, {
            shouldCheckStaleness: true,
            // Set ignoreDefaultImageTemplateScale because this.template is device screenshot based image
            // managed inside Appium after finidng image by template which managed by a user
            ignoreDefaultImageTemplateScale: true,
            containerRect: this.containerRect,
          }));
      } catch {
        throw new errors.StaleElementReferenceError();
      }

      if (!this.equals(newImgEl)) {
        log.warn(
          `When trying to click on an image element, the image changed ` +
            `position from where it was originally found. It is now at ` +
            `${JSON.stringify(newImgEl.rect)} and was originally at ` +
            `${JSON.stringify(this.rect)}.`
        );
        if (updatePos) {
          log.warn('Click will proceed at new coordinates');
          this.rect = _.clone(newImgEl.rect);
        } else {
          log.warn(
            'Click will take place at original coordinates. If you ' +
              'would like Appium to automatically click the new ' +
              "coordinates, set the 'autoUpdateImageElementPosition' " +
              'setting to true'
          );
        }
      }
    }

    const {x, y} = this.center;
    log.info(`Will tap on image element at coordinate [${x}, ${y}]`);

    if (imageElementTapStrategy === IMAGE_EL_TAP_STRATEGY_W3C) {
      // set up a W3C action to click on the image by position
      log.info('Will tap using W3C actions');
      const action = {
        type: 'pointer',
        id: 'mouse',
        parameters: {pointerType: 'touch'},
        actions: [
          {type: 'pointerMove', x, y, duration: 0},
          {type: 'pointerDown', button: 0},
          {type: 'pause', duration: TAP_DURATION_MS},
          {type: 'pointerUp', button: 0},
        ],
      };

      // check if the driver has the appropriate performActions method
      if ('performActions' in driver && _.isFunction(driver.performActions)) {
        return await driver.performActions([action]);
      }

      // if not, warn and fall back to the other method
      log.warn('Driver does not seem to implement W3C actions, falling back ' + 'to TouchActions');
    }

    // if the w3c strategy was not requested, do the only other option (mjsonwp
    // touch actions)
    log.info('Will tap using MJSONWP TouchActions');
    const action = {
      action: 'tap',
      options: {x, y},
    };

    if ('performTouch' in driver && _.isFunction(driver.performTouch)) {
      return await driver.performTouch([action]);
    }

    throw new Error(
      "Driver did not implement the 'performTouch' command. " +
        'For drivers to support finding image elements, they ' +
        "should support 'performTouch' and 'performActions'"
    );
  }

  /**
   * Perform lookup of image element(s) inside of the current element
   *
   * @param {boolean} multiple - Whether to lookup multiple elements
   * @param {import('appium/driver').BaseDriver} driver - The driver to use for commands
   * @param  {string[]} args = Rest of arguments for executeScripts
   * @returns {Promise<Element|Element[]|ImageElement>} - WebDriver element with a special id prefix
   */
  async find(multiple, driver, ...args) {
    const [strategy, selector] = args;
    if (strategy !== IMAGE_STRATEGY) {
      throw new errors.InvalidSelectorError(`Lookup strategies other than '${IMAGE_STRATEGY}' are not supported`);
    }
    return await (/** @type {import('./finder').default} */ (this.finder)).findByImage(
      Buffer.from(selector, 'base64'),
      driver,
      {multiple, containerRect: this.rect}
    );
  }

  /**
   * Handle various Appium commands that involve an image element
   *
   * @param {import('appium/driver').BaseDriver} driver - the driver to use for commands
   * @param {string} cmd - the name of the driver command
   * @param {any} imgEl - image element object
   * @param {string[]} args - Rest of arguments for executeScripts
   *
   * @returns {Promise<any>} - the result of running a command
   */
  static async execute(driver, imgEl, cmd, ...args) {
    switch (cmd) {
      case 'click':
        return await imgEl.click(driver);
      case 'findElementFromElement':
        return await imgEl.find(false, driver, ...args);
      case 'findElementsFromElement':
        return await imgEl.find(true, driver, ...args);
      case 'elementDisplayed':
        return true;
      case 'getSize':
        return imgEl.size;
      case 'getLocation':
      case 'getLocationInView':
        return imgEl.location;
      case 'getElementRect':
        return imgEl.rect;
      case 'getElementScreenshot':
        return imgEl.originalImage;
      case 'getAttribute':
        // /session/:sessionId/element/:elementId/attribute/:name
        // /session/:sessionId/element/:elementId/attribute/visual should retun the visual data
        // e.g. ["content-desc","appium-image-element-xxxxx","xxxxx"], ["visual","appium-image-element-xxxxx","xxxxx"]
        switch (args[0]) {
          case 'visual':
            return imgEl.matchedImage;
          case 'score':
            return imgEl.score;
          default:
            throw new errors.NotYetImplementedError();
        }
      default:
        throw new errors.NotYetImplementedError();
    }
  }
}

export {ImageElement};

/**
 * @typedef {import('@appium/types').Rect} Rect
 * @typedef {import('@appium/types').Element} Element
 */
