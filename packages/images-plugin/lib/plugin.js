/* eslint-disable no-case-declarations */

import _ from 'lodash';
import {errors} from 'appium/driver';
import BasePlugin from 'appium/plugin';
import {compareImages} from './compare';
import ImageElementFinder from './finder';
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

  async compareImages(next, driver, ...args) {
    return await compareImages(...args);
  }

  async findElement(next, driver, ...args) {
    return await this._find(false, next, driver, ...args);
  }

  async findElements(next, driver, ...args) {
    return await this._find(true, next, driver, ...args);
  }

  async _find(multiple, next, driver, ...args) {
    const [strategy, selector] = args;

    // if we're not actually finding by image, just do the normal thing
    if (strategy !== IMAGE_STRATEGY) {
      return await next();
    }

    this.finder.setDriver(driver);
    return await this.finder.findByImage(selector, {multiple});
  }

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
