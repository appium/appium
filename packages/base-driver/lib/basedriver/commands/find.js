/* eslint-disable no-unused-vars */
/* eslint-disable require-await */
// @ts-check
import {errors} from '../../protocol';

/**
 *
 * @param {EventBase} Base
 * @returns {FindBase}
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
    // Override the following function for your own driver, and the rest is taken
    // care of!
    // Returns an object which adheres to the way the JSON Wire Protocol represents elements:
    // { ELEMENT: # }    eg: { ELEMENT: 3 }  or { ELEMENT: 1.023 }
    /**
     * @template {boolean} Mult
     * @param {string} strategy
     * @param {string} selector
     * @param {Mult} mult
     * @param {string} [context]
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
     * @param {string} strategy
     * @param {string} selector
     * @param {Mult} mult
     * @param {string} [context]
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
 * @typedef {import('@appium/types').FindCommands} IFindCommands
 * @typedef {import('./event').EventBase} EventBase
 * @typedef {import('../driver').BaseDriverBase<import('@appium/types').TimeoutCommands & import('@appium/types').EventCommands & IFindCommands>} FindBase
 */
