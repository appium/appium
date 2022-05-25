import _ from 'lodash';
import {errors} from 'appium/driver';
import {util} from 'appium/support';
import log from './logger';
import {DEFAULT_SETTINGS, W3C_ELEMENT_KEY} from './finder';

const IMAGE_ELEMENT_PREFIX = 'appium-image-element-';
const TAP_DURATION_MS = 125;
const IMAGE_EL_TAP_STRATEGY_W3C = 'w3cActions';
const IMAGE_EL_TAP_STRATEGY_MJSONWP = 'touchActions';
const IMAGE_TAP_STRATEGIES = [IMAGE_EL_TAP_STRATEGY_MJSONWP, IMAGE_EL_TAP_STRATEGY_W3C];
const DEFAULT_TEMPLATE_IMAGE_SCALE = 1.0;

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
 * Representation of an "image element", which is simply a set of coordinates
 * and methods that can be used on that set of coordinates via the driver
 */
export class ImageElement {
  /** @type {string} */
  template;

  /** @type {Rect} */
  rect;

  /** @type {string} */
  id;

  /** @type {string|undefined} */
  b64MatchedImage;

  /** @type {import('./finder').ImageElementFinder|undefined} */
  finder;

  /** @type {number} */
  score;

  /**
   * @param {string} b64Template - the base64-encoded image which was used to
   *                               find this ImageElement
   * @param {Rect} rect - bounds of matched image element
   * @param {number} score The similarity score as a float number in range [0.0, 1.0].
   * 1.0 is the highest score (means both images are totally equal).
   * @param {string} [b64Result] - the base64-encoded image which has matched marks.
   * @param {import('./finder').ImageElementFinder} [finder] - the finder we can use to re-check stale elements
   */
  constructor(b64Template, rect, score, b64Result, finder) {
    this.template = b64Template;
    this.rect = rect;
    this.id = `${IMAGE_ELEMENT_PREFIX}${util.uuidV4()}`;
    this.b64MatchedImage = b64Result;
    this.score = score;
    this.finder = finder;
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
   * @todo This returns `null` for backwards-compat reasons
   * @returns {string?} - the base64-encoded image which has matched marks
   */
  get matchedImage() {
    return this.b64MatchedImage ?? null;
  }

  /**
   * @returns {Element} - this image element as a WebElement
   */
  asElement() {
    return {[W3C_ELEMENT_KEY]: this.id};
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
   * @param {import('@appium/types').ExternalDriver} driver - driver for calling actions with
   */
  async click(driver) {
    // before we click we need to make sure the element is actually still there
    // where we expect it to be
    /** @type {ImageElement} */
    let newImgEl;
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

    if (checkForImageElementStaleness || updatePos) {
      if (!this.finder) {
        throw new ReferenceError('No ImageFinder reference found!');
      }
      log.info('Checking image element for staleness before clicking');
      try {
        newImgEl = await this.finder.findByImage(this.template, {
          shouldCheckStaleness: true,
          // Set ignoreDefaultImageTemplateScale because this.template is device screenshot based image
          // managed inside Appium after finidng image by template which managed by a user
          ignoreDefaultImageTemplateScale: true,
        });
      } catch (err) {
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
      if (driver.performActions) {
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

    if (driver.performTouch) {
      return await driver.performTouch([action]);
    }

    throw new Error(
      "Driver did not implement the 'performTouch' command. " +
        'For drivers to support finding image elements, they ' +
        "should support 'performTouch' and 'performActions'"
    );
  }

  /**
   * Handle various Appium commands that involve an image element
   *
   * @param {import('@appium/types').ExternalDriver} driver - the driver to use for commands
   * @param {string} cmd - the name of the driver command
   * @param {ImageElement} imgEl - the id of the ImageElement to work with
   * @param {string[]} args - Rest of arguments for executeScripts
   *
   * @returns {Promise<object>} - the result of running a command
   */
  static async execute(driver, imgEl, cmd, ...args) {
    switch (cmd) {
      case 'click':
        return await imgEl.click(driver);
      case 'elementDisplayed':
        return true;
      case 'getSize':
        return imgEl.size;
      case 'getLocation':
      case 'getLocationInView':
        return imgEl.location;
      case 'getElementRect':
        return imgEl.rect;
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

export {
  IMAGE_EL_TAP_STRATEGY_MJSONWP,
  IMAGE_EL_TAP_STRATEGY_W3C,
  DEFAULT_TEMPLATE_IMAGE_SCALE,
  IMAGE_ELEMENT_PREFIX,
};

/**
 * @typedef {import('@appium/types').Rect} Rect
 * @typedef {import('@appium/types').Element} Element
 */
