import log from '../logger';


const commands = {}, helpers = {}, extensions = {};

// Override the following function for your own driver, and the rest is taken
// care of!

//helpers.findElOrEls = async function (strategy, selector, mult, context) {}
// strategy: locator strategy
// selector: the actual selector for finding an element
// mult: multiple elements or just one?
// context: finding an element from the root context? or starting from another element
//
// Returns an object which adheres to the way the JSON Wire Protocol represents elements:
// { ELEMENT: # }    eg: { ELEMENT: 3 }  or { ELEMENT: 1.023 }

helpers.findElOrElsWithProcessing = async function (strategy, selector, mult, context) {
  this.validateLocatorStrategy(strategy);
  try {
    return await this.findElOrEls(strategy, selector, mult, context);
  } catch (err) {
    if (this.opts.printPageSourceOnFindFailure) {
      const src = await this.getPageSource();
      log.debug(`Error finding element${mult ? 's' : ''}: ${err.message}`);
      log.debug(`Page source requested through 'printPageSourceOnFindFailure':`);
      log.debug(src);
    }
    // still want the error to occur
    throw err;
  }
};

commands.findElement = async function (strategy, selector) {
  return await this.findElOrElsWithProcessing(strategy, selector, false);
};

commands.findElements = async function (strategy, selector) {
  return await this.findElOrElsWithProcessing(strategy, selector, true);
};

commands.findElementFromElement = async function (strategy, selector, elementId) {
  return await this.findElOrElsWithProcessing(strategy, selector, false, elementId);
};

commands.findElementsFromElement = async function (strategy, selector, elementId) {
  return await this.findElOrElsWithProcessing(strategy, selector, true, elementId);
};

Object.assign(extensions, commands, helpers);
export { commands, helpers};
export default extensions;
