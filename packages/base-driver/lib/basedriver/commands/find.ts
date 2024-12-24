/* eslint-disable @typescript-eslint/no-unused-vars */
import {Constraints, Element, IFindCommands} from '@appium/types';
import {errors} from '../../protocol';
import {BaseDriver} from '../driver';
import {mixin} from './mixin';

declare module '../driver' {

  interface BaseDriver<C extends Constraints> extends IFindCommands {}
}

async function findElOrEls<C extends Constraints>(
  this: BaseDriver<C>,
  strategy: string,
  selector: string,
  mult: true,
  context?: any
): Promise<Element[]>;
async function findElOrEls<C extends Constraints>(
  this: BaseDriver<C>,
  strategy: string,
  selector: string,
  mult: false,
  context?: any
): Promise<Element>;
async function findElOrEls<C extends Constraints>(
  this: BaseDriver<C>,
  strategy: string,
  selector: string,
  mult: boolean,
  context?: any
): Promise<Element[] | Element> {
  throw new errors.NotImplementedError('Not implemented yet for find.');
}

async function findElOrElsWithProcessing<C extends Constraints>(
  this: BaseDriver<C>,
  strategy: string,
  selector: string,
  mult: true,
  context?: any
): Promise<Element[]>;
async function findElOrElsWithProcessing<C extends Constraints>(
  this: BaseDriver<C>,
  strategy: string,
  selector: string,
  mult: false,
  context?: any
): Promise<Element>;
async function findElOrElsWithProcessing<C extends Constraints>(
  this: BaseDriver<C>,
  strategy: string,
  selector: string,
  mult: boolean,
  context?: any
): Promise<Element[] | Element> {
  this.validateLocatorStrategy(strategy);
  try {
    // @ts-expect-error TS does not understand how to deal with the overload here
    return await this.findElOrEls(strategy, selector, mult, context);
  } catch (err) {
    if (this.opts.printPageSourceOnFindFailure) {
      const src = await this.getPageSource();
      this.log.debug(`Error finding element${mult ? 's' : ''}: ${err.message}`);
      this.log.debug(`Page source requested through 'printPageSourceOnFindFailure':`);
      this.log.debug(src);
    }
    // still want the error to occur
    throw err;
  }
}

const FindCommands: IFindCommands = {
  async findElement<C extends Constraints>(this: BaseDriver<C>, strategy, selector) {
    return await this.findElOrElsWithProcessing(strategy, selector, false);
  },

  async findElements<C extends Constraints>(this: BaseDriver<C>, strategy, selector) {
    return await this.findElOrElsWithProcessing(strategy, selector, true);
  },

  async findElementFromElement<C extends Constraints>(
    this: BaseDriver<C>,
    strategy: string,
    selector: string,
    elementId: string
  ) {
    return await this.findElOrElsWithProcessing(strategy, selector, false, elementId);
  },

  async findElementsFromElement<C extends Constraints>(
    this: BaseDriver<C>,
    strategy: string,
    selector: string,
    elementId: string
  ) {
    return await this.findElOrElsWithProcessing(strategy, selector, true, elementId);
  },

  findElOrEls,

  async getPageSource<C extends Constraints>(this: BaseDriver<C>) {
    throw new errors.NotImplementedError('Not implemented yet for find.');
  },

  findElOrElsWithProcessing,
};

mixin(FindCommands);
