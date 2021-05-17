import log from '../logger';
import { logger } from 'appium-support';
import _ from 'lodash';
import { errors } from '../../..';


const commands = {}, helpers = {}, extensions = {};

const CUSTOM_STRATEGY = '-custom';

// Override the following function for your own driver, and the rest is taken
// care of!

// helpers.findElOrEls = async function (strategy, selector, mult, context) {}
//   strategy: locator strategy
//   selector: the actual selector for finding an element
//   mult: multiple elements or just one?
//   context: finding an element from the root context? or starting from another element
//
// Returns an object which adheres to the way the JSON Wire Protocol represents elements:
// { ELEMENT: # }    eg: { ELEMENT: 3 }  or { ELEMENT: 1.023 }

helpers.findElOrElsWithProcessing = async function findElOrElsWithProcessing (strategy, selector, mult, context) {
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

commands.findElement = async function findElement (strategy, selector) {
  if (strategy === CUSTOM_STRATEGY) {
    return await this.findByCustom(selector, false);
  }

  return await this.findElOrElsWithProcessing(strategy, selector, false);
};

commands.findElements = async function findElements (strategy, selector) {
  if (strategy === CUSTOM_STRATEGY) {
    return await this.findByCustom(selector, true);
  }

  return await this.findElOrElsWithProcessing(strategy, selector, true);
};

commands.findElementFromElement = async function findElementFromElement (strategy, selector, elementId) {
  return await this.findElOrElsWithProcessing(strategy, selector, false, elementId);
};

commands.findElementsFromElement = async function findElementsFromElement (strategy, selector, elementId) {
  return await this.findElOrElsWithProcessing(strategy, selector, true, elementId);
};

/**
 * Find an element using a custom plugin specified by the customFindModules cap.
 *
 * @param {string} selector - the selector which the plugin will use to find
 * elements
 * @param {boolean} multiple - whether we want one element or multiple
 *
 * @returns {WebElement} - WebDriver element or list of elements
 */
commands.findByCustom = async function findByCustom (selector, multiple) {
  const plugins = this.opts.customFindModules;

  // first ensure the user has registered one or more find plugins
  if (!plugins) {
    // TODO this info should go in docs instead; update when docs for this
    // feature exist
    throw new Error('Finding an element using a plugin is currently an ' +
      'incubating feature. To use it you must manually install one or more ' +
      'plugin modules in a way that they can be required by Appium, for ' +
      'example installing them from the Appium directory, installing them ' +
      'globally, or installing them elsewhere and passing an absolute path as ' +
      'the capability. Then construct an object where the key is the shortcut ' +
      'name for this plugin and the value is the module name or absolute path, ' +
      'for example: {"p1": "my-find-plugin"}, and pass this in as the ' +
      "'customFindModules' capability.");
  }

  // then do some basic checking of the type of the capability
  if (!_.isPlainObject(plugins)) {
    throw new Error("Invalid format for the 'customFindModules' capability. " +
      'It should be an object with keys corresponding to the short names and ' +
      'values corresponding to the full names of the element finding plugins');
  }

  // get the name of the particular plugin used for this invocation of find,
  // and separate it from the selector we will pass to the plugin
  let [plugin, realSelector] = selector.split(':');

  // if the user didn't specify a plugin for this find invocation, and we had
  // multiple plugins registered, that's a problem
  if (_.size(plugins) > 1 && !realSelector) {
    throw new Error(`Multiple element finding plugins were registered ` +
      `(${_.keys(plugins)}), but your selector did not indicate which plugin ` +
      `to use. Ensure you put the short name of the plugin followed by ':' as ` +
      `the initial part of the selector string.`);
  }

  // but if they did not specify a plugin and we only have one plugin, just use
  // that one
  if (_.size(plugins) === 1 && !realSelector) {
    realSelector = plugin;
    plugin = _.keys(plugins)[0];
  }

  if (!plugins[plugin]) {
    throw new Error(`Selector specified use of element finding plugin ` +
      `'${plugin}' but it was not registered in the 'customFindModules' ` +
      `capability.`);
  }

  let finder;
  try {
    log.debug(`Find plugin '${plugin}' requested; will attempt to use it ` +
      `from '${plugins[plugin]}'`);
    finder = require(plugins[plugin]);
  } catch (err) {
    throw new Error(`Could not load your custom find module '${plugin}'. Did ` +
      `you put it somewhere Appium can 'require' it? Original error: ${err}`);
  }

  if (!finder || !_.isFunction(finder.find)) {
    throw new Error('Your custom find module did not appear to be constructed ' +
        'correctly. It needs to export an object with a `find` method.');
  }

  const customFinderLog = logger.getLogger(plugin);

  let elements;
  const condition = async () => {
    // get a list of matched elements from the custom finder, which can
    // potentially use the entire suite of methods the current driver provides.
    // the finder should always return a list of elements, but may use the
    // knowledge of whether we are looking for one or many to perform internal
    // optimizations
    elements = await finder.find(this, customFinderLog, realSelector, multiple);

    // if we're looking for multiple elements, or if we're looking for only
    // one and found it, we're done
    if (!_.isEmpty(elements) || multiple) {
      return true;
    }

    // otherwise we should retry, so return false to trigger the retry loop
    return false;
  };

  try {
    // make sure we respect implicit wait
    await this.implicitWaitForCondition(condition);
  } catch (err) {
    if (err.message.match(/Condition unmet/)) {
      throw new errors.NoSuchElementError();
    }
    throw err;
  }

  return multiple ? elements : elements[0];
};

Object.assign(extensions, commands, helpers);
export { commands, helpers, CUSTOM_STRATEGY };
export default extensions;
