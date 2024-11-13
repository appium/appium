import _ from 'lodash';
import {
  DESKTOP_BROWSERS,
  DESKTOP_DRIVERS,
  MOBILE_DRIVERS
} from '../constants';
import {runExtensionCommand} from './extension';
import { system, fs } from '@appium/support';
import log from '../logger';

/**
 * Subcommands of preset for setup
 */
export const SUBCOMMAND_MOBILE = 'mobile';
export const SUBCOMMAND_DESKTOP = 'desktop';
export const SUBCOMMAND_BROWSER = 'browser';
export const SUBCOMMAND_RESET = 'reset';

/**
 * Pairs of preset subcommand and driver candidates.
 * Driver names listed in KNOWN_DRIVERS to install by default
 */
const PRESET_PAIRS = Object.freeze(
  /** @type {const} */ ({
    mobile: _.keys(MOBILE_DRIVERS),
    desktop: _.keys(DESKTOP_DRIVERS),
    browser: _.keys(DESKTOP_BROWSERS)
  }),
);
const DRIVERS_ONLY_MACOS = ['xcuitest', 'safari', 'mac2'];

const DRIVERS_ONLY_WINDOWS = ['windows'];

/**
 * Plugin names listed in KNOWN_PLUGINS to install by default.
 */
export const DEFAULT_PLUGINS = ['images'];

/**
 * Return a list of drivers available for current host platform.
 * @param {import('appium/types').CliCommandSetupSubcommand} presetName
 * @returns {Array<string>}
 */
export function getPresetDrivers(presetName) {
  return _.filter(PRESET_PAIRS[presetName], (driver) => {
    if (_.includes(DRIVERS_ONLY_MACOS, driver)) {
      return system.isMac();
    }

    if (_.includes(DRIVERS_ONLY_WINDOWS, driver)) {
      return system.isWindows();
    }

    return true;
  });

}

/**
 * Return desktop platform name for setup command description.
 * @returns {string}
 */
export function determinePlatformName() {
  if (system.isMac()) {
    return 'macOS';
  } else if (system.isWindows()) {
    return 'Windows';
  }
  return 'Linux';
}

/**
 * Run 'setup' command to install drivers/plugins into the given appium home.
 * @template {import('appium/types').CliCommandSetup} SetupCmd
 * @param {import('appium/types').Args<SetupCmd>} preConfigArgs
 * @param {DriverConfig} driverConfig
 * @param {PluginConfig} pluginConfig
 * @returns {Promise<void>}
 */
export async function runSetupCommand(preConfigArgs, driverConfig, pluginConfig) {
  switch (preConfigArgs.setupCommand) {
    case SUBCOMMAND_DESKTOP:
      await setupDesktopAppDrivers(driverConfig);
      await setupDefaultPlugins(pluginConfig);
      break;
    case SUBCOMMAND_BROWSER:
      await setupBrowserDrivers(driverConfig);
      await setupDefaultPlugins(pluginConfig);
      break;
    case SUBCOMMAND_RESET:
      await resetAllExtensions(driverConfig, pluginConfig);
      break;
    default:
      await setupMobileDrivers(driverConfig);
      await setupDefaultPlugins(pluginConfig);
      break;
  }
};

/**
 * Resets all installed drivers and extensions
 *
 * @param {DriverConfig} driverConfig
 * @param {PluginConfig} pluginConfig
 * @returns {Promise<void>}
 */
async function resetAllExtensions(driverConfig, pluginConfig) {
  for (const [command, config] of [
    ['driver', driverConfig],
    ['plugin', pluginConfig],
  ]) {
    for (const extensionName of _.keys(/** @type {DriverConfig|PluginConfig} */ (config).installedExtensions)) {
      try {
        await uninstallExtension(
          extensionName,
          extensionCommandArgs(/** @type {CliExtensionCommand} */ (command), extensionName, 'uninstall'),
          /** @type {DriverConfig|PluginConfig} */ (config)
        );
      } catch (e) {
        log.warn(
          `${extensionName} ${command} cannot be uninstalled. Will delete the manifest anyway. ` +
          `Original error: ${e.stack}`
        );
      }
    }

    const manifestPath = /** @type {DriverConfig|PluginConfig} */ (config).manifestPath;
    if (!await fs.exists(manifestPath)) {
      continue;
    }

    await fs.rimraf(manifestPath);
    if (await fs.exists(manifestPath)) {
      throw new Error(`${command} manifest at '${manifestPath}' cannot be deleted. Is it accessible?`);
    } else {
      log.info(`Successfully deleted ${command} manifest at '${manifestPath}'`);
    }
  }
}

/**
 * Install drivers listed in DEFAULT_DRIVERS.
 * @param {DriverConfig} driverConfig
 * @returns {Promise<void>}
 */
async function setupMobileDrivers(driverConfig) {
  await installDrivers(SUBCOMMAND_MOBILE, driverConfig);
}

/**
 * Install all of known drivers listed in BROWSER_DRIVERS.
 * @param {DriverConfig} driverConfig
 * @returns {Promise<void>}
 */
async function setupBrowserDrivers(driverConfig) {
  await installDrivers(SUBCOMMAND_BROWSER, driverConfig);
}

/**
 * Install all of known drivers listed in DESKTOP_APP_DRIVERS.
 * @param {DriverConfig} driverConfig
 * @returns {Promise<void>}
 */
async function setupDesktopAppDrivers(driverConfig) {
  await installDrivers(SUBCOMMAND_DESKTOP, driverConfig);
}

/**
 * Install the given driver name. It skips the installation if the given driver name was already installed.
 * @param {import('appium/types').CliCommandSetupSubcommand} subcommand
 * @param {DriverConfig} driverConfig
 * @returns {Promise<void>}
 */
async function installDrivers(subcommand, driverConfig) {
  for (const driverName of getPresetDrivers(subcommand)) {
    await installExtension(driverName, extensionCommandArgs('driver', driverName, 'install'), driverConfig);
  }
}

/**
 * Install plugins listed in DEFAULT_PLUGINS.
 * @param {PluginConfig} pluginConfig
 * @returns {Promise<void>}
 */
async function setupDefaultPlugins(pluginConfig) {
  for (const pluginName of DEFAULT_PLUGINS) {
    await installExtension(pluginName, extensionCommandArgs('plugin', pluginName, 'install'), pluginConfig);
  }
}

/**
 * Run the given extensionConfigArgs command after checking if the given extensionName was already installed.
 * @param {string} extensionName
 * @param {Args} extensionConfigArgs
 * @param {DriverConfig|PluginConfig} extensionConfig
 * @returns {Promise<void>}
 */
async function installExtension(extensionName, extensionConfigArgs, extensionConfig) {
  if (_.keys(extensionConfig.installedExtensions).includes(extensionName)) {
    log.info(`${extensionName} (${extensionConfig.installedExtensions[extensionName].version}) is already installed. ` +
      `Skipping the installation.`);
    return;
  }
  await runExtensionCommand(extensionConfigArgs, extensionConfig);
}

/**
 * Run the given extensionConfigArgs command after checking if the given extensionName was already installed.
 * @param {string} extensionName
 * @param {Args} extensionConfigArgs
 * @param {DriverConfig|PluginConfig} extensionConfig
 * @returns {Promise<void>}
 */
async function uninstallExtension(extensionName, extensionConfigArgs, extensionConfig) {
  if (!_.keys(extensionConfig.installedExtensions).includes(extensionName)) {
    log.info(`${extensionName} (${extensionConfig.installedExtensions[extensionName].version}) is not installed. ` +
      `Skipping its uninstall.`);
    return;
  }
  await runExtensionCommand(extensionConfigArgs, extensionConfig);
}

/**
 * Return the command config for driver or plugin.
 * @param {CliExtensionCommand} extensionCommand
 * @param {string} extensionName
 * @param {CliExtensionSubcommand} command
 * @returns {Args}
 */
function extensionCommandArgs(extensionCommand, extensionName, command) {
  return (extensionCommand === 'plugin')
    ? {'subcommand': 'plugin', 'pluginCommand': command, 'plugin': extensionName}
    : {'subcommand': 'driver', 'driverCommand': command, 'driver': extensionName};
}

/**
 * @typedef {import('appium/types').CliExtensionCommand} CliExtensionCommand
 * @typedef {import('appium/types').CliExtensionSubcommand} CliExtensionSubcommand
 * @typedef {import('../extension/extension-config').ExtensionConfig<CliExtensionCommand>} PluginConfig
 * @typedef {import('../extension/extension-config').ExtensionConfig<CliExtensionCommand>} DriverConfig
 */

/**
 * @typedef {import('appium/types').Args<CliExtensionCommand, CliExtensionSubcommand>} Args
 */
