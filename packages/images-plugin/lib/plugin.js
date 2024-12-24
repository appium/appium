

import _ from 'lodash';
import {errors} from 'appium/driver';
import {BasePlugin} from 'appium/plugin';
import {compareImages} from './compare';
import ImageElementFinder from './finder';
import {ImageElement} from './image-element';
import {IMAGE_STRATEGY, IMAGE_ELEMENT_PREFIX} from './constants';

function getImgElFromArgs(args) {
  return args.find((arg) => _.isString(arg) && arg.startsWith(IMAGE_ELEMENT_PREFIX));
}

export default class ImageElementPlugin extends BasePlugin {
  constructor(pluginName) {
    super(pluginName);
    this.finder = new ImageElementFinder();
  }

  // this plugin supports a non-standard 'compare images' command
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

  async compareImages(next, driver, ...args) {
    // @ts-ignore Arguments should be ok there
    return await compareImages(...args);
  }

  async findElement(next, driver, ...args) {
    return await this._find(false, next, driver, ...args);
  }

  async findElements(next, driver, ...args) {
    return await this._find(true, next, driver, ...args);
  }

  /**
   *
   * @param {boolean} multiple
   * @param {*} next
   * @param {*} driver
   * @param  {...any} args
   * @returns {Promise<any>}
   */
  async _find(multiple, next, driver, ...args) {
    const [strategy, selector] = args;

    // if we're not actually finding by image, just do the normal thing
    if (strategy !== IMAGE_STRATEGY) {
      return await next();
    }

    return await this.finder.findByImage(Buffer.from(selector, 'base64'), driver, {multiple});
  }

  async handle(next, driver, cmdName, ...args) {
    // if we have a command that involves an image element id, attempt to find the image element
    // and execute the command on it
    const imgElId = getImgElFromArgs(args);
    if (imgElId) {
      const imgEl = this.finder.getImageElement(imgElId);
      if (!imgEl) {
        throw new errors.NoSuchElementError();
      }
      return await ImageElement.execute(driver, imgEl, cmdName, ...args);
    }

    if (cmdName === 'deleteSession') {
      this.finder.clearImageElements();
    }

    // otherwise just do the normal thing
    return await next();
  }
}

export {ImageElementPlugin, getImgElFromArgs, IMAGE_STRATEGY};
