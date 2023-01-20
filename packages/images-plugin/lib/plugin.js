/* eslint-disable no-case-declarations */

import _ from 'lodash';
import {errors} from 'appium/driver';
import BasePlugin from 'appium/plugin';
import {compareImages} from './compare';
import ImageElementFinder from './finder';
import {ImageElement, IMAGE_ELEMENT_PREFIX} from './image-element';

const IMAGE_STRATEGY = '-image';

/**
 *
 * @param {any[]} args - An array of arguments
 * @returns {string}
 */
function getImgElFromArgs(args) {
  for (let arg of args) {
    if (_.isString(arg) && arg.startsWith(IMAGE_ELEMENT_PREFIX)) {
      return arg;
    }
  }
}

/**
 * A plugin for Appium that provides support for finding elements by image and comparing images.
 *
 * @implements {Plugin}
 */
export default class ImageElementPlugin extends BasePlugin {
  /**
   *
   * @param {string} pluginName - The name of the plugin.
   */
  constructor(pluginName) {
    super(pluginName);
    this.finder = new ImageElementFinder();
  }

  // Map route path to  to HTTP methods and command details
  static newMethodMap = /** @type {const} */ ({
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
  });

  /**
   *
   * @param {Function} next - The function to be executed after this one
   * @param {ExtDriver} driver - The driver instance
   * @param {string} mode
   * @param {string} firstImage
   * @param {string} secondImage
   * @param {Object} [options={}]
   * @returns {Promise<OccurrenceResult>}
   */
  async compareImages(next, driver, mode, firstImage, secondImage, options = {}) {
    return await compareImages(mode, firstImage, secondImage, options);
  }

  /**
   *
   * @param {Function} next - The function to be executed after this one
   * @param {ExtDriver} driver - The driver instance
   * @param {string} strategy - The strategy used to locate the elements
   * @param {string} selector - The image selector
   * @returns {Promise<any>}
   */
  async findElement(next, driver, strategy, selector) {
    return await this._find(false, next, driver, strategy, selector);
  }

  /**
   *
   * @param {Function} next - The function to be executed after this one
   * @param {ExtDriver} driver - The driver instance
   * @param {string} strategy - The strategy used to locate the elements
   * @param {string} selector - The image selector
   * @returns {Promise<any>}
   */
  async findElements(next, driver, strategy, selector) {
    return await this._find(true, next, driver, strategy, selector);
  }

  /**
   *
   * @param {boolean} multiple - True if finding multiple elements, false if finding a single element
   * @param {Function} next - The function to be executed after this one
   * @param {ExtDriver} driver - The driver instance
   * @param {string} strategy - The strategy used to locate the elements
   * @param {string} selector - The image selector
   * @returns {Promise<any>}
   */
  async _find(multiple, next, driver, strategy, selector) {
    // if we're not actually finding by image, just do the normal thing
    if (strategy !== IMAGE_STRATEGY) {
      return await next();
    }

    this.finder.setDriver(driver);
    return await this.finder.findByImage(selector, {multiple});
  }

  /**
   *
   * @param {Function} next - The function to be executed after this one
   * @param {ExtDriver} driver - The driver instance
   * @param {string} cmdName - The command name
   * @param {any[]} args
   * @returns {Promise<any>}
   */
  async handle(next, driver, cmdName, ...args) {
    // if we have a command that involves an image element id, attempt to find the image element
    // and execute the command on it
    const imgElId = getImgElFromArgs(args);
    if (imgElId) {
      if (!this.finder.imgElCache.has(imgElId)) {
        throw new errors.NoSuchElementError();
      }
      const imgEl = this.finder.imgElCache.get(imgElId);
      return await ImageElement.execute(driver, imgEl, cmdName, ...args);
    }

    // otherwise just do the normal thing
    return await next();
  }
}

export {ImageElementPlugin, getImgElFromArgs, IMAGE_STRATEGY};

/**
 * @typedef {import('@appium/types').ExternalDriver} ExtDriver
 */

/**
 * @typedef {import('@appium/types').Plugin} Plugin
 */

/**
 * @typedef {import('@appium/opencv').OccurrenceResult} OccurrenceResult
 */
