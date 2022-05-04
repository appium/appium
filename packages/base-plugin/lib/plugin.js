import {logger} from '@appium/support';

/**
 * @implements {Plugin}
 */
class BasePlugin {
  /** @type {import('@appium/types').PluginStatic['newMethodMap']} */
  static newMethodMap = {};

  /** @type {Plugin['cliArgs']} */
  cliArgs;

  /**
   * @param {string} pluginName
   */
  constructor(pluginName) {
    this.name = pluginName;
    this.logger = logger.getLogger(`Plugin [${pluginName}]`);
  }
}

export default BasePlugin;
export {BasePlugin};

/**
 * @typedef {import('@appium/types').Plugin} Plugin
 */
