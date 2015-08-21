let commands = {}, helpers = {}, extensions = {};

// Override the following function for your own driver, and the rest is taken
// care of!

//helpers.findElOrEls = async function (strategy, selector, mult, context) {}
// strategy: locator strategy
// selector: the actual selector for finding an element
// mult: multiple elements or just one?
// context: finding an element from the root context? or starting from another element

commands.findElement = async function (strategy, selector) {
  this.validateLocatorStrategy(strategy);
  return this.findElOrEls(strategy, selector, false);
};

commands.findElements = async function (strategy, selector) {
  this.validateLocatorStrategy(strategy);
  return this.findElOrEls(strategy, selector, true);
};

commands.findElementFromElement = async function (strategy, selector, elementId) {
  this.validateLocatorStrategy(strategy);
  return this.findElOrEls(strategy, selector, false, elementId);
};

commands.findElementsFromElement = async function (strategy, selector, elementId) {
  this.validateLocatorStrategy(strategy);
  return this.findElOrEls(strategy, selector, true, elementId);
};

Object.assign(extensions, commands, helpers);
export { commands, helpers};
export default extensions;
