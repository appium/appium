import _ from 'lodash';
import { KNOWN_DRIVERS, KNOWN_PLUGINS, SETUP_SUBCOMMAND } from '../constants';
import {runExtensionCommand} from './extension';

/**
 * Driver names listed in KNOWN_DRIVERS to install by default.
 */
export const DEFAULT_DRIVERS = ['uiautomator2', 'xcuitest'];

/**
 * Plugin names listed in KNOWN_PLUGINS to install by default.
 */
export const DEFAULT_PLUGINS = ['images'];

/**
 * Subcommand for 'setup' to install all known drivers/plugins.
 */
const SUBCOMMAND_ALL = 'all';


/**
 * Run 'setup' command to install drivers/plugins into the given appium home.
 * @template {import('appium/types').CliCommandSetup} SetupCmd
 * @template {import('appium/types').CliExtensionCommand} ExtCmd
 * @param {string} appiumHome
 * @param {import('appium/types').Args<SetupCmd>} preConfigArgs
 * @param {import('../extension/extension-config').ExtensionConfig<ExtCmd>} driverConfig
 * @param {import('../extension/extension-config').ExtensionConfig<ExtCmd>} pluginConfig
 * @returns
 */
export async function runSetupCommand(appiumHome, preConfigArgs, driverConfig, pluginConfig) {
  if (!_.isEmpty(driverConfig.installedExtensions) || !_.isEmpty(pluginConfig.installedExtensions)) {
    throw new Error(`'${SETUP_SUBCOMMAND}' will not run because '${appiumHome}' already has drivers: '${
      _.isEmpty(driverConfig.installedExtensions)
      ? '(no drivers)'
      : _.join(_.keys(driverConfig.installedExtensions), ',')
    }', plugins: '${
      _.isEmpty(pluginConfig.installedExtensions)
      ? '(no plugins)'
      : _.join(_.keys(pluginConfig.installedExtensions), ',')
    }'`);
  }

  if (preConfigArgs.setupCommand === SUBCOMMAND_ALL) {
    await setupDriverFull(driverConfig);
    await setupPluginFull(pluginConfig);
    return;
  }

  await setupDriverDefault(driverConfig);
  await setupPluginDefault(pluginConfig);
};

/**
 * Install drivers listed in DEFAULT_DRIVERS.
 * @template {import('appium/types').CliExtensionCommand} ExtCmd
 * @param {import('../extension/extension-config').ExtensionConfig<ExtCmd>} driverConfig
 */
async function setupDriverDefault(driverConfig) {
  for (const driverName of DEFAULT_DRIVERS) {
    await setupDriver(driverName, driverConfig);
  }
}

/**
 * Install all of known drivers listed in KNOWN_DRIVERS.
 * @template {import('appium/types').CliExtensionCommand} ExtCmd
 * @param {import('../extension/extension-config').ExtensionConfig<ExtCmd>} driverConfig
 */
async function setupDriverFull(driverConfig) {
  for (const driver of _.keys(KNOWN_DRIVERS)) {
    await setupDriver(driver, driverConfig);
  }
}

/**
 * Install the given driver name.
 * @param {string} driverName
 * @param {import('../extension/extension-config').ExtensionConfig<CliExtensionCommand>} driverConfig
 */
async function setupDriver(driverName, driverConfig) {
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
 * Install drivers listed in DEFAULT_PLUGINS.
 * @template {import('appium/types').CliExtensionCommand} ExtCmd
 * @param {import('../extension/extension-config').ExtensionConfig<ExtCmd>} pluginConfig
 */
async function setupPluginDefault(pluginConfig) {
  for (const pluginName of DEFAULT_PLUGINS) {
    await setupPlugin(pluginName, pluginConfig);
  }
}

/**
 * Install all of known plugins listed in driverConfig.
 * @template {import('appium/types').CliExtensionCommand} ExtCmd
 * @param {import('../extension/extension-config').ExtensionConfig<ExtCmd>} pluginConfig
 */
async function setupPluginFull(pluginConfig) {
  for (const pluginName of _.keys(KNOWN_PLUGINS)) {
    await setupPlugin(pluginName, pluginConfig);
  }
}

/**
 * Install the given plugin name.
 * @param {string} pluginName
 * @param {import('../extension/extension-config').ExtensionConfig<CliExtensionCommand>} pluginConfig
 */
async function setupPlugin(pluginName, pluginConfig) {
  const pluginConfigArgs = {
    'subcommand': 'plugin',
    'pluginCommand': 'install',
    'plugin': pluginName,
    'extraArgs': []
  };
  await runExtensionCommand(/** @type {Args} */(pluginConfigArgs), pluginConfig);
}

/**
 * @typedef {import('appium/types').CliExtensionCommand} CliExtensionCommand
 * @typedef {import('appium/types').CliExtensionSubcommand} CliExtensionSubcommand

 */
/**
 * @typedef {import('appium/types').Args<CliExtensionCommand, CliExtensionSubcommand>} Args
 */