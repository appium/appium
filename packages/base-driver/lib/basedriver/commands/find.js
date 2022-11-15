/* eslint-disable no-unused-vars */
/* eslint-disable require-await */
// @ts-check
import {errors} from '../../protocol';

/**
 * @template {Constraints} C
 * @param {import('./event').EventBase<C>} Base
 * @returns {FindBase<C>}
 */
export function FindMixin(Base) {
  /**
   * @implements {IFindCommands}
   */
  class FindCommands extends Base {
    /**
     *
     * @returns {Promise<Element>}
     */
    async findElement(strategy, selector) {
      return await this.findElOrElsWithProcessing(strategy, selector, false);
    }

    /**
     *
     * @returns {Promise<Element[]>}
     */
    async findElements(strategy, selector) {
      return await this.findElOrElsWithProcessing(strategy, selector, true);
    }

    /**
     *
     * @returns {Promise<Element>}
     */
    async findElementFromElement(strategy, selector, elementId) {
      return await this.findElOrElsWithProcessing(strategy, selector, false, elementId);
    }

    /**
     *
     * @returns {Promise<Element[]>}
     */
    async findElementsFromElement(strategy, selector, elementId) {
      return await this.findElOrElsWithProcessing(strategy, selector, true, elementId);
    }
    /**
     * Returns an object which adheres to the way the JSON Wire Protocol represents elements:
     *
     * Override this for your own driver!
     * @template {boolean} Mult
     * @template [Ctx=any]
     * @param {string} strategy
     * @param {string} selector
     * @param {Mult} mult
     * @param {Ctx} [context]
     * @returns {Promise<Mult extends true ? Element[] : Element>}
     */
    async findElOrEls(strategy, selector, mult, context) {
      throw new errors.NotImplementedError('Not implemented yet for find.');
    }

    /**
     * @returns {Promise<string>}
     */
    async getPageSource() {
      throw new errors.NotImplementedError('Not implemented yet for find.');
    }
    /**
     * @template {boolean} Mult
     * @template [Ctx=any]
     * @param {string} strategy
     * @param {string} selector
     * @param {Mult} mult
     * @param {Ctx} [context]
     * @returns {Promise<Mult extends true ? Element[] : Element>}
     */
    async findElOrElsWithProcessing(strategy, selector, mult, context) {
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
    }
  }

  return FindCommands;
}

/**
 * @typedef {import('@appium/types').Element} Element
 * @typedef {import('@appium/types').Constraints} Constraints
 * @typedef {import('@appium/types').IFindCommands} IFindCommands
 * @typedef {import('@appium/types').ITimeoutCommands} ITimeoutCommands
 * @typedef {import('@appium/types').IEventCommands} IEventCommands
 */
/**
 * @template {Constraints} C
 * @typedef {import('../driver').BaseDriverBase<C, ITimeoutCommands & IEventCommands & IFindCommands>} FindBase
 */
