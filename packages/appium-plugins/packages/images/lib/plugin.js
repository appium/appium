/* eslint-disable no-case-declarations */

import _ from 'lodash';
import { errors } from 'appium-base-driver';
import BasePlugin from '@appium/base-plugin';
import { compareImages } from './compare';
import ImageElementFinder from './finder';
import { ImageElement, IMAGE_ELEMENT_PREFIX } from './image-element';

const IMAGE_STRATEGY = '-image';

function getImgElFromArgs (args) {
  for (let arg of args) {
    if (_.isString(arg) && arg.startsWith(IMAGE_ELEMENT_PREFIX)) {
      return arg;
    }
  }
}

export default class ImageElementPlugin extends BasePlugin {

  constructor (pluginName) {
    super(pluginName);
    this.finder = new ImageElementFinder();
  }

  // say that we handle all commands since we want to be on the lookout for anything with an image
  // element in the payload
  commands = true;

  // this plugin supports a non-standard 'compare images' command
  newMethodMap = {
    '/session/:sessionId/appium/compare_images': {
      POST: {
        command: 'compareImages',
        payloadParams: {
          required: ['mode', 'firstImage', 'secondImage'],
          optional: ['options']
        },
      }
    },
  };

  async handle (next, driver, cmdName, ...args) {
    // if we want to compare images, do that
    if (cmdName === 'compareImages') {
      return await compareImages(...args);
    }

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

    // otherwise, if we have any other command except a find command, or if we have a find command
    // that has nothing to do with image elements, just defer to the regular behavior
    const [strategy, selector] = args;
    if ((cmdName !== 'findElement' && cmdName !== 'findElements') || strategy !== IMAGE_STRATEGY) {
      return await next();
    }

    const multiple = cmdName === 'findElements';

    // finally, if we want to find image elements, do that!
    this.finder.setDriver(driver);
    return await this.finder.findByImage(selector, {multiple});
  }
}

export { ImageElementPlugin, getImgElFromArgs, IMAGE_STRATEGY };
