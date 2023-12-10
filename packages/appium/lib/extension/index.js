import _ from 'lodash';
import {USE_ALL_PLUGINS} from '../constants';
import log from '../logger';
import {DriverConfig} from './driver-config';
import {Manifest} from './manifest';
import {timing} from '@appium/support';
import {PluginConfig} from './plugin-config';
import B from 'bluebird';

/**
 * Loads extensions and creates `ExtensionConfig` instances.
 *
 * - Reads the manifest file, creating if necessary
 * - Using the parsed extension data, creates/gets the `ExtensionConfig` subclass instances
 * - Returns these instances
 *
 * If `appiumHome` is needed, use `resolveAppiumHome` from the `env` module in `@appium/support`.
 * @param {string} appiumHome
 * @returns {Promise<ExtensionConfigs>}
 */
export async function loadExtensions(appiumHome) {
  const manifest = Manifest.getInstance(appiumHome);
  await manifest.read();
  const driverConfig = DriverConfig.getInstance(manifest) ?? DriverConfig.create(manifest);
  const pluginConfig = PluginConfig.getInstance(manifest) ?? PluginConfig.create(manifest);

  await B.all([driverConfig.validate(), pluginConfig.validate()]);
  return {driverConfig, pluginConfig};
}

/**
 * Find any plugin name which has been installed, and which has been requested for activation by
 * using the --use-plugins flag, and turn each one into its class, so we can send them as objects
 * to the server init. We also want to send/assign them to the umbrella driver so it can use them
 * to wrap command execution
 *
 * @param {import('./plugin-config').PluginConfig} pluginConfig - a plugin extension config
 * @param {string[]} usePlugins
 * @returns {Promise<PluginNameMap>} Mapping of PluginClass to name
 */
export async function getActivePlugins(pluginConfig, usePlugins = []) {
  if (_.isEmpty(usePlugins)) {
    return new Map();
  }

  /** @type {string[]} */
  let filteredPluginNames = [];
  if (usePlugins.length === 1 && usePlugins[0] === USE_ALL_PLUGINS) {
    filteredPluginNames = _.keys(pluginConfig.installedExtensions);
  } else {
    // It is important to load plugins in the same order that was used while enumerating them
    for (const pluginName of usePlugins) {
      if (pluginName in pluginConfig.installedExtensions) {
        filteredPluginNames.push(pluginName);
      } else if (pluginName === USE_ALL_PLUGINS) {
        throw new Error(
          `The reserved plugin name '${pluginName}' cannot be combined with other names.`
        );
      } else {
        throw new Error(
          `Could not load the plugin '${pluginName}' because it is not installed. ` +
          `Only the following plugins are available: ${_.keys(pluginConfig.installedExtensions)}`
        );
      }
    }
  }
  const loadPromises = /** @type {[Promise<PluginClass>, string][]} */ (filteredPluginNames
    .map((pluginName) => {
      const promise = (async () => {
        log.info(`Attempting to load plugin ${pluginName}...`);
        const timer = new timing.Timer().start();
        try {
          const pluginClass = await pluginConfig.requireAsync(pluginName);
          log.debug(`${pluginClass.name} has been successfully loaded in ${timer.getDuration().asSeconds.toFixed(3)}s`);
          return pluginClass;
        } catch (err) {
          log.error(
            `Could not load plugin '${pluginName}', so it will not be available. Error ` +
              `in loading the plugin was: ${err.message}`
          );
          log.debug(err.stack);
        }
      })();
      return [promise, pluginName];
    })
    .filter(([p,]) => Boolean(p)));
  const resolvedPairs = /** @type {[PluginClass, string][]} */ (_.zip(
    await B.all(loadPromises.map(([p]) => p)),
    loadPromises.map(([, name]) => name)
  ));
  return new Map(resolvedPairs);
}

/**
 * Find any driver name which has been installed, and turn each one into its class, so we can send
 * them as objects to the server init in case they need to add methods/routes or update the server.
 * If the --drivers flag was given, this method only loads the given drivers.
 *
 * @param {import('./driver-config').DriverConfig} driverConfig - a driver extension config
 * @param {string[]} [useDrivers] - optional list of drivers to load
 * @returns {Promise<DriverNameMap>}
 */
export async function getActiveDrivers(driverConfig, useDrivers = []) {
  /** @type {string[]} */
  let filteredDriverNames = [];
  if (useDrivers.length === 0) {
    // load all drivers if none are requested
    filteredDriverNames = _.keys(driverConfig.installedExtensions);
  } else {
    // Load drivers in the same order that was used while enumerating them
    for (const driverName of useDrivers) {
      if (driverName in driverConfig.installedExtensions) {
        filteredDriverNames.push(driverName);
      } else {
        throw new Error(
          `Could not load the driver '${driverName}' because it is not installed. ` +
          `Only the following drivers are available: ${_.keys(driverConfig.installedExtensions)}`
        );
      }
    }
  }
  const loadPromises = /** @type {[Promise<DriverClass>, string][]} */ (filteredDriverNames
    .map((driverName) => {
      const promise = (async () => {
        log.info(`Attempting to load driver ${driverName}...`);
        const timer = new timing.Timer().start();
        try {
          const driverClass = await driverConfig.requireAsync(driverName);
          log.debug(`${driverClass.name} has been successfully loaded in ${timer.getDuration().asSeconds.toFixed(3)}s`);
          return driverClass;
        } catch (err) {
          log.error(
            `Could not load driver '${driverName}', so it will not be available. Error ` +
              `in loading the driver was: ${err.message}`
          );
          log.debug(err.stack);
        }
      })();
      return [promise, driverName];
    })
    .filter(([p,]) => Boolean(p)));

  const resolvedPairs = /** @type {[DriverClass, string][]} */ (_.zip(
    await B.all(loadPromises.map(([p]) => p)),
    loadPromises.map(([, name]) => name)
  ));
  return new Map(resolvedPairs);
}

/**
 * A mapping of {@linkcode PluginClass} classes to their names.
 * @typedef {Map<PluginClass,string>} PluginNameMap
 */

/**
 * A mapping of {@linkcode DriverClass} classes to their names.
 * @typedef {Map<DriverClass,string>} DriverNameMap
 */

/**
 * @typedef {import('@appium/types').PluginClass} PluginClass
 * @typedef {import('@appium/types').DriverClass} DriverClass
 */

/**
 * @typedef ExtensionConfigs
 * @property {import('./driver-config').DriverConfig} driverConfig
 * @property {import('./plugin-config').PluginConfig} pluginConfig
 */
