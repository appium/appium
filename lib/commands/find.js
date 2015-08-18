let commands = {}, helpers = {}, extensions = {};

// Override the following function for your own driver, and the rest is taken
// care of!

// stategy: locator strategy
// selector: the actual selector for finding an element
// mult: multiple elements or just one?
// context: finding an element from the root context? or starting from another element
//helpers.findElOrEls = async function (strategy, selector, mult, context) {}

commands.findElement = async function (strategy, selector) {
  return this.findElOrEls(strategy, selector, false);
};

commands.findElements = async function (strategy, selector) {
  return this.findElOrEls(strategy, selector, true);
};

commands.findElementFromElement = async function (strategy, selector, elementId) {
  return this.findElOrEls(strategy, selector, false, elementId);
};

commands.findElementsFromElement = async function (strategy, selector, elementId) {
  return this.findElOrEls(strategy, selector, true, elementId);
};

Object.assign(extensions, commands, helpers);
export { commands, helpers};
export default extensions;
