import {Constraints, IFindCommands} from '@appium/types';
import {errors} from '../../protocol';
import {BaseDriver} from '../driver';
import {mixin} from './mixin';

declare module '../driver' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BaseDriver<C extends Constraints> extends IFindCommands {}
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

  /**
   * Returns an object which adheres to the way the JSON Wire Protocol represents elements:
   *
   * Override this for your own driver!
   */
  async findElOrEls<C extends Constraints, Mult extends boolean, Ctx = any>(
    this: BaseDriver<C>,
    strategy: string,
    selector: string,
    mult: Mult,
    context: Ctx
  ) {
    throw new errors.NotImplementedError('Not implemented yet for find.');
  },

  async getPageSource<C extends Constraints>(this: BaseDriver<C>) {
    throw new errors.NotImplementedError('Not implemented yet for find.');
  },

  async findElOrElsWithProcessing<C extends Constraints, Mult extends boolean, Ctx = any>(
    this: BaseDriver<C>,
    strategy: string,
    selector: string,
    mult: Mult,
    context?: Ctx
  ) {
    this.validateLocatorStrategy(strategy);
    try {
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
  },
};

mixin(FindCommands);
