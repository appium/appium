import _ from 'lodash';
import {USE_ALL_PLUGINS} from '../constants';
import log from '../logger';
import {DriverConfig} from './driver-config';
import {Manifest} from './manifest';
import {PluginConfig} from './plugin-config';

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
  const {drivers, plugins} = await manifest.read();
  const driverConfig =
    DriverConfig.getInstance(manifest) ?? DriverConfig.create(manifest, {extData: drivers});
  const pluginConfig =
    PluginConfig.getInstance(manifest) ?? PluginConfig.create(manifest, {extData: plugins});
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
 * @returns {import('appium/types').PluginClass[]}
 */
export function getActivePlugins(pluginConfig, usePlugins = []) {
  return _.compact(
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

          PluginClass.pluginName = pluginName; // store the plugin name on the class so it can be used later
          return PluginClass;
        } catch (err) {
          log.error(
            `Could not load plugin '${pluginName}', so it will not be available. Error ` +
              `in loading the plugin was: ${err.message}`
          );
          log.debug(err.stack);
        }
      })
  );
}

/**
 * Find any driver name which has been installed, and turn each one into its class, so we can send
 * them as objects to the server init in case they need to add methods/routes or update the server.
 * If the --drivers flag was given, this method only loads the given drivers.
 *
 * @param {import('./driver-config').DriverConfig} driverConfig - a driver extension config
 * @param {string[]} [useDrivers] - optional list of drivers to load
 */
export function getActiveDrivers(driverConfig, useDrivers = []) {
  return _.compact(
    Object.keys(driverConfig.installedExtensions)
      .filter((driverName) => _.includes(useDrivers, driverName) || useDrivers.length === 0)
      .map((driverName) => {
        try {
          log.info(`Attempting to load driver ${driverName}...`);
          return driverConfig.require(driverName);
        } catch (err) {
          log.error(
            `Could not load driver '${driverName}', so it will not be available. Error ` +
              `in loading the driver was: ${err.message}`
          );
          log.debug(err.stack);
        }
      })
  );
}

/**
 * @typedef ExtensionConfigs
 * @property {DriverConfig} driverConfig
 * @property {PluginConfig} pluginConfig
 */
