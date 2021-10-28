import _ from 'lodash';
import ExtensionConfig from './extension-config';
import { PLUGIN_TYPE } from './ext-config-io';
import log from './logger';

export default class PluginConfig extends ExtensionConfig {

  /**
   * A mapping of `APPIUM_HOME` values to {@link PluginConfig} instances.
   * Each `APPIUM_HOME` should only have one associated `PluginConfig` instance.
   * @type {Record<string,PluginConfig>}
   * @private
   */
  static _instances = {};

  /**
   * Call {@link PluginConfig.getInstance} instead.
   *
   * Just calls the superclass' constructor with the correct extension type
   * @private
   * @param {string} appiumHome - `APPIUM_HOME` path
   * @param {(...args: any[]) => void)} [logFn] - Optional logging function
   */
  constructor (appiumHome, logFn) {
    super(appiumHome, PLUGIN_TYPE, logFn);
  }

  /**
   * Creates or gets an instance of {@link PluginConfig} based value of `appiumHome`
   * @param {string} appiumHome - `APPIUM_HOME` path
   * @param {(...args: any[]) => void} [logFn] - Optional logging function
   * @returns {PluginConfig}
   */
  static getInstance (appiumHome, logFn) {
    const instance = PluginConfig._instances[appiumHome] ?? new PluginConfig(appiumHome, logFn);
    PluginConfig._instances[appiumHome] = instance;
    return instance;
  }

  extensionDesc (pluginName, {version}) {
    return `${pluginName}@${version}`;
  }

  print (activeNames) {
    const pluginNames = Object.keys(this.installedExtensions);

    if (_.isEmpty(pluginNames)) {
      log.info(`No plugins have been installed. Use the "appium plugin" ` +
               'command to install the one(s) you want to use.');
      return;
    }

    log.info(`Available plugins:`);
    for (const [pluginName, pluginData] of _.toPairs(this.installedExtensions)) {
      const activeTxt = _.includes(activeNames, pluginName) ? ' (ACTIVE)' : '';
      log.info(`  - ${this.extensionDesc(pluginName, pluginData)}${activeTxt}`);
    }

    if (_.isEmpty(activeNames)) {
      log.info('No plugins activated. Use the --plugins flag with names of plugins to activate');
    }
  }
}
