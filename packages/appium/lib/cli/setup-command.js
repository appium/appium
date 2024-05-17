import _ from 'lodash';
import {
  DESKTOP_BROWSER_DRIVERS,
  DESKTOP_DRIVERS,
  MOBILE_DRIVERS,
  SETUP_SUBCOMMAND
} from '../constants';
import {runExtensionCommand} from './extension';
import { system } from '@appium/support';
import log from '../logger';

/**
 * Subcommands of preset for setup
 */
export const SUBCOMMAND_MOBILE = 'mobile';
export const SUBCOMMAND_DESKTOP = 'desktop';
export const SUBCOMMAND_BROWSER = 'browser';

/**
 * A subcommand to remove APPIUM_HOME
 */
export const SUBCOMMAND_RESET = 'reset';

/**
 * Pairs of preset subcommand and driver candidates.
 * Driver names listed in KNOWN_DRIVERS to install by default
 */
const PRESET_PAIRS = Object.freeze(
  /** @type {const} */ ({
    mobile: _.keys(MOBILE_DRIVERS),
    desktop: _.keys(DESKTOP_DRIVERS),
    browser: _.keys(DESKTOP_BROWSER_DRIVERS)
  }),
);
const DRIVERS_ONLY_MACOS = ['xcuitest', 'safari', 'mac2'];

/**
 * Plugin names listed in KNOWN_PLUGINS to install by default.
 */
export const DEFAULT_PLUGINS = [];

/**
 * Return a list of drivers available for current host platform.
 * @param {import('appium/types').CliCommandSetupSubcommand} subcmd
 * @returns {Array<string>}
 */
export function getPresetDrivers(subcmd) {
  return _.filter(PRESET_PAIRS[subcmd], (driver) => {
    if (!system.isMac() && _.includes(DRIVERS_ONLY_MACOS, driver)) {
      return;
    }
    return driver;
  });
}


/**
 * Return desktop platform name for setup command description.
 * @returns {string}
 */
export function hostPlatformName() {
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
    case SUBCOMMAND_RESET:
      await resetDriversPlugins(driverConfig, pluginConfig);
      break;
    case SUBCOMMAND_DESKTOP:
      await setupDriverDesktopApp(driverConfig);
      await setupPluginDefault(pluginConfig);
      break;
    case SUBCOMMAND_BROWSER:
      await setupDriverBrowser(driverConfig);
      await setupPluginDefault(pluginConfig);
      break;
    default:
      await setupDriverMobile(driverConfig);
      await setupPluginDefault(pluginConfig);
      break;
  }
};


/**
 * Uninstall installed drivers and plugins in APPIUM_HOME.
 * @param {DriverConfig} driverConfig
 * @param {PluginConfig} pluginConfig
 * @returns {Promise<void>}
 */
async function resetDriversPlugins(driverConfig, pluginConfig) {
  log.info('Uninstalling drivers/plugins in APPIUM_HOME');

  for (const driverName of _.keys(driverConfig.installedExtensions)) {
    await uninstallDriver(driverName, driverConfig);
  }

  for (const driverName of _.keys(pluginConfig.installedExtensions)) {
    await uninstallPlugin(driverName, pluginConfig);
  }
}


/**
 * Install drivers listed in DEFAULT_DRIVERS.
 * @param {DriverConfig} driverConfig
 * @returns {Promise<void>}
 */
async function setupDriverMobile(driverConfig) {
  for (const driverName of getPresetDrivers(SUBCOMMAND_MOBILE)) {
    await setupDriver(driverName, driverConfig);
  }
}

/**
 * Install all of known drivers listed in BROWSER_DRIVERS.
 * @param {DriverConfig} driverConfig
 * @returns {Promise<void>}
 */
async function setupDriverBrowser(driverConfig) {
  for (const driver of getPresetDrivers(SUBCOMMAND_BROWSER)) {
    await setupDriver(driver, driverConfig);
  }
}

/**
 * Install all of known drivers listed in DESKTOP_APP_DRIVERS.
 * @param {DriverConfig} driverConfig
 */
async function setupDriverDesktopApp(driverConfig) {
  for (const driver of getPresetDrivers(SUBCOMMAND_DESKTOP)) {
    await setupDriver(driver, driverConfig);
  }
}

/**
 * Install the given driver name. It skips the installation if the given driver name was already installed.
 * @param {string} driverName
 * @param {DriverConfig} driverConfig
 * @returns {Promise<void>}
 */
async function setupDriver(driverName, driverConfig) {
  if (_.keys(driverConfig.installedExtensions).includes(driverName)) {
    log.info(`${driverName} (${driverConfig.installedExtensions[driverName].version}) is already installed.`);
    return;
  }

  /** @type {Args} */
  const driverConfigArgs = {
    'subcommand': 'driver',
    'driverCommand': 'install',
    'driver': driverName,
    'extraArgs': []
  };
  await runExtensionCommand(driverConfigArgs, driverConfig);
}

/**
 * Uninstall the given driver name.
 * @param {string} driverName
 * @param {DriverConfig} driverConfig
 * @returns {Promise<void>}
 */
async function uninstallDriver(driverName, driverConfig) {
  /** @type {Args} */
  const driverConfigArgs = {
    'subcommand': 'driver',
    'driverCommand': 'uninstall',
    'driver': driverName,
    'extraArgs': []
  };
  await runExtensionCommand(driverConfigArgs, driverConfig);
}

/**
 * Install drivers listed in DEFAULT_PLUGINS.
 * @param {PluginConfig} pluginConfig
 * @returns {Promise<void>}
 */
async function setupPluginDefault(pluginConfig) {
  for (const pluginName of DEFAULT_PLUGINS) {
    await setupPlugin(pluginName, pluginConfig);
  }
}

/**
 * Install the given plugin name. It skips the installation if the given plugin name was already installed.
 * @param {string} pluginName
 * @param {PluginConfig} pluginConfig
 * @returns {Promise<void>}
 */
async function setupPlugin(pluginName, pluginConfig) {
  if (_.keys(pluginConfig.installedExtensions).includes(pluginName)) {
    log.info(`${pluginName} (${pluginConfig.installedExtensions[pluginName].version}) is already installed. Skipping the install.`);
    return;
  }

  const pluginConfigArgs = {
    'subcommand': 'plugin',
    'pluginCommand': 'install',
    'plugin': pluginName,
    'extraArgs': []
  };
  await runExtensionCommand(/** @type {Args} */(pluginConfigArgs), pluginConfig);
}

/**
 * Uninstall the given driver name.
 * @param {string} pluginName
 * @param {DriverConfig} pluginConfig
 * @returns {Promise<void>}
 */
async function uninstallPlugin(pluginName, pluginConfig) {
  const pluginConfigArgs = {
    'subcommand': 'plugin',
    'pluginCommand': 'uninstall',
    'plugin': pluginName,
    'extraArgs': []
  };
  await runExtensionCommand(/** @type {Args} */(pluginConfigArgs), pluginConfig);
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
