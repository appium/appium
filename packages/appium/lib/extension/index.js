import _ from 'lodash';
import {USE_ALL_PLUGINS} from '../constants';
import log from '../logger';
import {DriverConfig} from './driver-config';
import {Manifest} from './manifest';
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
 * @returns {PluginNameMap} Mapping of PluginClass to name
 */
export function getActivePlugins(pluginConfig, usePlugins = []) {
  return new Map(
    _.compact(
      Object.keys(pluginConfig.installedExtensions)
        .filter(
          (pluginName) =>
            _.includes(usePlugins, pluginName) ||
            (usePlugins.length === 1 && usePlugins[0] === USE_ALL_PLUGINS)
        )
        .map((pluginName) => {
          try {
            log.info(`Attempting to load plugin ${pluginName}...`);
            const PluginClass = pluginConfig.require(pluginName);
            return [PluginClass, pluginName];
          } catch (err) {
            log.error(
              `Could not load plugin '${pluginName}', so it will not be available. Error ` +
                `in loading the plugin was: ${err.message}`
            );
            log.debug(err.stack);
          }
        })
    )
  );
}

/**
 * Find any driver name which has been installed, and turn each one into its class, so we can send
 * them as objects to the server init in case they need to add methods/routes or update the server.
 * If the --drivers flag was given, this method only loads the given drivers.
 *
 * @param {import('./driver-config').DriverConfig} driverConfig - a driver extension config
 * @param {string[]} [useDrivers] - optional list of drivers to load
 * @returns {DriverNameMap}
 */
export function getActiveDrivers(driverConfig, useDrivers = []) {
  return new Map(
    _.compact(
      Object.keys(driverConfig.installedExtensions)
        .filter((driverName) => _.includes(useDrivers, driverName) || useDrivers.length === 0)
        .map((driverName) => {
          try {
            log.info(`Attempting to load driver ${driverName}...`);
            const DriverClass = driverConfig.require(driverName);
            return [DriverClass, driverName];
          } catch (err) {
            log.error(
              `Could not load driver '${driverName}', so it will not be available. Error ` +
                `in loading the driver was: ${err.message}`
            );
            log.debug(err.stack);
          }
        })
    )
  );
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
