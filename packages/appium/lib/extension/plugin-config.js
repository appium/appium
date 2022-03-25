
import _ from 'lodash';
import {ExtensionConfig} from './extension-config';
import log from '../logger';
import {PLUGIN_TYPE} from '../constants';

/**
 * @extends {ExtensionConfig<PluginType>}
 */
export class PluginConfig extends ExtensionConfig {

  /**
   * A mapping of {@link Manifest} instances to {@link PluginConfig} instances.
   *
   * `Manifest` and {@link ExtensionConfig} have a one-to-many relationship; each `Manifest` should be associated with a `DriverConfig` and a `PluginConfig`; no more, no less.
   *
   * This variable tracks the `Manifest`-to-`PluginConfig` portion.
   *
   * @type {WeakMap<Manifest,PluginConfig>}
   * @private
   */
   static _instances = new WeakMap();

   /**
   * Call {@link PluginConfig.create} instead.
   *
   * Just calls the superclass' constructor with the correct extension type
   * @private
   * @param {Manifest} manifest - IO object
   * @param {PluginConfigOptions} [opts]
   */
   constructor (manifest, {extData, logFn} = {}) {
     super(PLUGIN_TYPE, manifest, logFn);

     if (extData) {
       this.validate(extData);
     }
   }

   /**
    * Creates a new {@link PluginConfig} instance for a {@link Manifest} instance.
    *
    * @param {Manifest} manifest
    * @param {PluginConfigOptions} [opts]
    * @throws If `manifest` already associated with a `PluginConfig`
    * @returns {PluginConfig}
    */
   static create (manifest, {extData, logFn} = {}) {
     const instance = new PluginConfig(manifest, {logFn, extData});
     if (PluginConfig.getInstance(manifest)) {
       throw new Error(`Manifest with APPIUM_HOME ${manifest.appiumHome} already has a PluginConfig; use PluginConfig.getInstance() to retrieve it.`);
     }
     PluginConfig._instances.set(manifest, instance);
     return instance;
   }

   /**
     * Returns a PluginConfig associated with a Manifest
     * @param {Manifest} manifest
     * @returns {PluginConfig|undefined}
     */
   static getInstance (manifest) {
     return PluginConfig._instances.get(manifest);
   }

   /**
   * @param {string} pluginName
   * @param {import('../../types/appium-manifest').ExtManifest<PluginType>} pluginData
   * @returns {string}
   */
   extensionDesc (pluginName, {version}) {
     return `${pluginName}@${version}`;
   }

   /**
   *
   * @param {(keyof PluginRecord)[]} activeNames
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
 * @typedef PluginConfigOptions
 * @property {import('./extension-config').ExtensionLogFn} [logFn] - Optional logging function
 * @property {import('../../types/appium-manifest').PluginRecord} [extData] - Extension data
 */


/**
 * @typedef {import('../../types/appium-manifest').PluginRecord} PluginRecord
 * @typedef {import('../../types').PluginType} PluginType
 * @typedef {import('../../types/external-manifest').ExtMetadata<PluginType>} PluginMetadata
 * @typedef {import('./manifest').Manifest} Manifest
 */
