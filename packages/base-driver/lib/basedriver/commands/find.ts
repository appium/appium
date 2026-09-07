import type {Constraints, Element, IFindCommands} from '@appium/types';

import {errors} from '../../protocol/index.js';
import type {BaseDriver} from '../driver.js';

declare module '../driver.js' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BaseDriver<C extends Constraints> extends IFindCommands {}
}

/**
 * Find a UI element given a locator strategy and a selector, erroring if it can't be found
 * @see {@link https://w3c.github.io/webdriver/#find-element}
 *
 * @param strategy - the locator strategy
 * @param selector - the selector to combine with the strategy to find the specific element
 *
 * @returns The element object encoding the element id which can be used in element-related
 * commands
 */
export async function findElement<C extends Constraints>(this: BaseDriver<C>, strategy: string, selector: string) {
  return await this.findElOrElsWithProcessing(strategy, selector, false);
}

/**
 * Find a a list of all UI elements matching a given a locator strategy and a selector
 * @see {@link https://w3c.github.io/webdriver/#find-elements}
 *
 * @param strategy - the locator strategy
 * @param selector - the selector to combine with the strategy to find the specific elements
 *
 * @returns A possibly-empty list of element objects
 */
export async function findElements<C extends Constraints>(this: BaseDriver<C>, strategy: string, selector: string) {
  return await this.findElOrElsWithProcessing(strategy, selector, true);
}

/**
 * Find a UI element given a locator strategy and a selector, erroring if it can't be found. Only
 * look for elements among the set of descendants of a given element
 * @see {@link https://w3c.github.io/webdriver/#find-element-from-element}
 *
 * @param strategy - the locator strategy
 * @param selector - the selector to combine with the strategy to find the specific element
 * @param elementId - the id of the element to use as the search basis
 *
 * @returns The element object encoding the element id which can be used in element-related
 * commands
 */
export async function findElementFromElement<C extends Constraints>(
  this: BaseDriver<C>,
  strategy: string,
  selector: string,
  elementId: string,
) {
  return await this.findElOrElsWithProcessing(strategy, selector, false, elementId);
}

/**
 * Find a a list of all UI elements matching a given a locator strategy and a selector. Only
 * look for elements among the set of descendants of a given element
 * @see {@link https://w3c.github.io/webdriver/#find-elements-from-element}
 *
 * @param strategy - the locator strategy
 * @param selector - the selector to combine with the strategy to find the specific elements
 * @param elementId - the id of the element to use as the search basis
 *
 * @returns A possibly-empty list of element objects
 */
export async function findElementsFromElement<C extends Constraints>(
  this: BaseDriver<C>,
  strategy: string,
  selector: string,
  elementId: string,
) {
  return await this.findElOrElsWithProcessing(strategy, selector, true, elementId);
}

/**
 * A helper method that returns one or more UI elements based on the search criteria
 *
 * @param strategy - the locator strategy
 * @param selector - the selector
 * @param mult - whether or not we want to find multiple elements
 * @param context - the element to use as the search context basis if desiredCapabilities
 *
 * @returns A single element or list of elements
 */
export async function findElOrEls<C extends Constraints>(
  this: BaseDriver<C>,
  strategy: string,
  selector: string,
  mult: true,
  context?: any,
): Promise<Element[]>;
export async function findElOrEls<C extends Constraints>(
  this: BaseDriver<C>,
  strategy: string,
  selector: string,
  mult: false,
  context?: any,
): Promise<Element>;
export async function findElOrEls<C extends Constraints>(
  this: BaseDriver<C>,
  strategy: string,
  selector: string,
  mult: boolean,
  context?: any,
): Promise<Element[] | Element>;
export async function findElOrEls<C extends Constraints>(
  this: BaseDriver<C>,
  strategy: string,
  selector: string,
  mult: boolean,
  context?: any,
): Promise<Element[] | Element> {
  void strategy;
  void selector;
  void mult;
  void context;
  throw new errors.NotImplementedError('Not implemented yet for find.');
}

/**
 * Get the current page/app source as HTML/XML
 * @see {@link https://w3c.github.io/webdriver/#get-page-source}
 *
 * @returns The UI hierarchy in a platform-appropriate format (e.g., HTML for a web page)
 */
export async function getPageSource<C extends Constraints>(this: BaseDriver<C>): Promise<string> {
  throw new errors.NotImplementedError('Not implemented yet for find.');
}

/**
 * This is a wrapper for {@linkcode findElOrEls} that validates locator strategies
 * and implements the `appium:printPageSourceOnFindFailure` capability
 *
 * @param strategy - the locator strategy
 * @param selector - the selector
 * @param mult - whether or not we want to find multiple elements
 * @param context - the element to use as the search context basis if desiredCapabilities
 *
 * @returns A single element or list of elements
 */
export async function findElOrElsWithProcessing<C extends Constraints>(
  this: BaseDriver<C>,
  strategy: string,
  selector: string,
  mult: true,
  context?: any,
): Promise<Element[]>;
export async function findElOrElsWithProcessing<C extends Constraints>(
  this: BaseDriver<C>,
  strategy: string,
  selector: string,
  mult: false,
  context?: any,
): Promise<Element>;
export async function findElOrElsWithProcessing<C extends Constraints>(
  this: BaseDriver<C>,
  strategy: string,
  selector: string,
  mult: boolean,
  context?: any,
): Promise<Element[] | Element> {
  this.validateLocatorStrategy(strategy);
  try {
    return await this.findElOrEls(strategy, selector, mult, context);
  } catch (err) {
    if (this.opts.printPageSourceOnFindFailure) {
      const message = err instanceof Error ? err.message : String(err);
      this.log.debug(`Error finding element${mult ? 's' : ''}: ${message}`);
      // Fetching the page source is only a diagnostic aid here. If it fails then
      // the error above is still the one the client must receive.
      try {
        const src = await this.getPageSource();
        this.log.debug(`Page source requested through 'printPageSourceOnFindFailure':`);
        this.log.debug(src);
      } catch (pageSourceErr) {
        const pageSourceMessage = pageSourceErr instanceof Error ? pageSourceErr.message : String(pageSourceErr);
        this.log.warn(
          `Could not retrieve the page source requested through ` +
            `'printPageSourceOnFindFailure': ${pageSourceMessage}`,
        );
      }
    }
    // still want the error to occur
    throw err;
  }
}
