import _ from 'lodash';
import {errors} from 'appium/driver';
import {util} from '@appium/support';
import {BasePlugin} from 'appium/plugin';
import {compareImages} from './compare';
import {ImageElementFinder} from './finder';
import {ImageElement} from './image-element';
import {IMAGE_STRATEGY, IMAGE_ELEMENT_PREFIX} from './constants';
import type {ExternalDriver, Element, ActionSequence} from '@appium/types';
import type {MatchingOptions, SimilarityOptions, OccurrenceOptions} from '@appium/opencv';

export function getImgElFromArgs(args: any[]): string | undefined {
  return args.find((arg) => _.isString(arg) && arg.startsWith(IMAGE_ELEMENT_PREFIX));
}

export class ImageElementPlugin extends BasePlugin {
  readonly finder: ImageElementFinder;

  constructor(pluginName: string) {
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
  } as const;

  async compareImages(
    next: () => Promise<any>,
    driver: ExternalDriver,
    mode: string,
    firstImage: string | Buffer,
    secondImage: string | Buffer,
    options?: MatchingOptions | SimilarityOptions | OccurrenceOptions
  ): Promise<any> {
    return await compareImages(mode, firstImage, secondImage, options);
  }

  async findElement(next: () => Promise<any>, driver: ExternalDriver, ...args: any[]): Promise<any> {
    return await this._find(false, next, driver, ...args);
  }

  async findElements(next: () => Promise<any>, driver: ExternalDriver, ...args: any[]): Promise<any> {
    return await this._find(true, next, driver, ...args);
  }

  private async _find(
    multiple: boolean,
    next: () => Promise<any>,
    driver: ExternalDriver,
    ...args: any[]
  ): Promise<any> {
    const [strategy, selector] = args;

    // if we're not actually finding by image, just do the normal thing
    if (strategy !== IMAGE_STRATEGY) {
      return await next();
    }

    return await this.finder.findByImage(Buffer.from(selector, 'base64'), driver, {multiple});
  }

  async handle(
    next: () => Promise<any>,
    driver: ExternalDriver,
    cmdName: string,
    ...args: any[]
  ): Promise<any> {
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

  async performActions(
    next: () => Promise<any>,
    driver: ExternalDriver,
    actionSequences: ActionSequence[]
  ): Promise<any> {
    // Replace with coordinates when ActionSequence includes image elements.
    for (const actionSequence of actionSequences) {
      for (const action of actionSequence.actions) {
        // The actions that can have an Element as the origin are "pointerMove" and "scroll".
        if (!_.isPlainObject((action as any).origin)) {
          continue;
        }

        const actionWithEl = action as any;

        const elId = util.unwrapElement(actionWithEl.origin as Element);
        if (!_.startsWith(elId, IMAGE_ELEMENT_PREFIX)) {
          continue;
        }

        const imgEl = this.finder.getImageElement(elId);
        if (!imgEl) {
          throw new errors.NoSuchElementError();
        }

        // Add the element's center coordinates to the offset value.
        actionWithEl.x += imgEl.center.x;
        actionWithEl.y += imgEl.center.y;
        // Set the origin to the viewport so that the external driver can process it using coordinates.
        delete actionWithEl.origin;
      }
    }

    return await next();
  }
}
