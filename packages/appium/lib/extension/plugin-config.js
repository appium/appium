// @ts-check

import _ from 'lodash';
import {ExtensionConfig} from './extension-config';
import log from '../logger';
import {PLUGIN_TYPE} from '../constants';

/**
 * @extends {ExtensionConfig<PluginType>}
 */
export class PluginConfig extends ExtensionConfig {
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
   * @param {import('./manifest').Manifest} io - IO object
   * @param {PluginConfigOptions} [opts]
   */
  constructor (io, {extData, logFn} = {}) {
    super(PLUGIN_TYPE, io, logFn);

    if (extData) {
      this.validate(extData);
    }
  }

  /**
   *
   * @param {import('./manifest').Manifest} io
   * @param {PluginConfigOptions} [opts]
   * @returns {PluginConfig}
   */
  static create (io, {extData, logFn} = {}) {
    const instance = new PluginConfig(io, {logFn, extData});
    PluginConfig._instances[io.appiumHome] = instance;
    return instance;
  }

  /**
   * Creates or gets an instance of {@link PluginConfig} based value of `appiumHome`
   * @param {import('./manifest').Manifest} io - IO object
   * @returns {PluginConfig}
   */
  static getInstance (io) {
    return PluginConfig._instances[io.appiumHome];
  }


  /**
   * @param {string} pluginName
   * @param {PluginData} pluginData
   * @returns {string}
   */
  extensionDesc (pluginName, {version}) {
    return `${pluginName}@${version}`;
  }

  /**
   *
   * @param {(keyof import('./manifest').ExtRecord<PluginType>)[]} activeNames
   * @returns {void}
   */
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
      log.info('No plugins activated. Use the --use-plugins flag with names of plugins to activate');
    }
  }
}

/**
 * @typedef {Object} PluginConfigOptions
 * @property {import('./extension-config').ExtensionLogFn} [logFn] - Optional logging function
 * @property {import('./manifest').ExtRecord<PluginType>} [extData] - Extension data
 */

/**
 * @typedef {import('./manifest').PluginType} PluginType
 */

/**
 * @typedef {import('./manifest').ExtData<PluginType>} PluginData
 */
