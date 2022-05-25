/* eslint-disable no-case-declarations */

import _ from 'lodash';
import {errors} from 'appium/driver';
import {BasePlugin} from 'appium/plugin';
import {compareImages} from './compare';
import {ImageElementFinder} from './finder';
import {ImageElement, IMAGE_ELEMENT_PREFIX} from './image-element';

const IMAGE_STRATEGY = '-image';

function getImgElFromArgs(args) {
  for (let arg of args) {
    if (_.isString(arg) && arg.startsWith(IMAGE_ELEMENT_PREFIX)) {
      return arg;
    }
  }
}

export default class ImageElementPlugin extends BasePlugin {
  constructor(pluginName) {
    super(pluginName);
    this.finder = new ImageElementFinder();
  }

  // this plugin supports a non-standard 'compare images' command
  static newMethodMap = {
    '/session/:sessionId/appium/compare_images': {
      POST: {
        command: 'compareImages',
        payloadParams: {
          required: ['mode', 'firstImage', 'secondImage'],
          optional: ['options'],
        },
        neverProxy: true,
      },
    },
  };

  async compareImages(next, driver, mode, firstImage, secondImage, opts) {
    return await compareImages(mode, firstImage, secondImage, opts);
  }

  async findElement(next, driver, strategy, selector) {
    return await this._find(false, next, driver, strategy, selector);
  }

  async findElements(next, driver, strategy, selector) {
    return await this._find(true, next, driver, strategy, selector);
  }

  /**
   * @template {boolean} Multiple
   * @template {string} Strategy
   * @param {Multiple} multiple
   * @param {import('@appium/types').NextPluginCallback} next
   * @param {import('@appium/types').ExternalDriver} driver
   * @param {Strategy} strategy
   * @param {string} selector
   * @returns {Promise<FindResult<Strategy,Multiple>>}
   */
  async _find(multiple, next, driver, strategy, selector) {
    // if we're not actually finding by image, just do the normal thing
    if (strategy !== IMAGE_STRATEGY) {
      return /** @type {FindResult<Strategy,Multiple>} */ (await next());
    }

    this.finder.setDriver(driver);
    return /** @type {FindResult<Strategy,Multiple>} */ (
      await this.finder.findByImage(selector, {multiple, shouldCheckStaleness: false})
    );
  }

  async handle(next, driver, cmdName, ...args) {
    // if we have a command that involves an image element id, attempt to find the image element
    // and execute the command on it
    const imgElId = getImgElFromArgs(args);
    if (imgElId) {
      if (!this.finder.imgElCache.has(imgElId)) {
        throw new errors.NoSuchElementError();
      }
      const imgEl = /** @type {ImageElement} */ (this.finder.imgElCache.get(imgElId));
      return await ImageElement.execute(driver, imgEl, cmdName, ...args);
    }

    // otherwise just do the normal thing
    return await next();
  }
}

export {ImageElementPlugin, getImgElFromArgs, IMAGE_STRATEGY};

/**
 * @typedef {import('@appium/types').Element} Element
 */

/**
 * @template {string} Strategy
 * @template {boolean} [Multiple=false]
 * @typedef {Strategy extends typeof IMAGE_STRATEGY ? Multiple extends true ? Element[] : Element : void} FindResult
 */
