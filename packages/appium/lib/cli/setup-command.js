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
    await setupDriverFull(preConfigArgs, driverConfig);
    await setupPluginFull(preConfigArgs, pluginConfig);
    return;
  }

  await setupDriverDefault(preConfigArgs, driverConfig);
  await setupPluginDefault(preConfigArgs, pluginConfig);
};

async function setupDriverDefault(configArgs, driverConfig) {
  for (const driverName of DEFAULT_DRIVERS) {
    await setupDriver(driverName, configArgs, driverConfig);
  }
}

async function setupDriverFull(configArgs, driverConfig) {
  for (const driver of _.keys(KNOWN_DRIVERS)) {
    await setupDriver(driver, configArgs, driverConfig);
  }
}

async function setupDriver(driverName, configArgs, driverConfig) {
  const driverConfigArgs = configArgs;
  driverConfigArgs.subcommand = 'driver';
  driverConfigArgs.driverCommand = 'install';
  driverConfigArgs.driver = driverName;
  await runExtensionCommand(driverConfigArgs, driverConfig);
}

async function setupPluginDefault(configArgs, pluginConfig) {
  for (const pluginName of DEFAULT_PLUGINS) {
    await setupPlugin(pluginName, configArgs, pluginConfig);
  }
}

async function setupPluginFull(configArgs, driverConfig) {
  for (const pluginName of _.keys(KNOWN_PLUGINS)) {
    await setupPlugin(pluginName, configArgs, driverConfig);
  }
}

async function setupPlugin(pluginName, configArgs, pluginConfig) {
  const pluginConfigArgs = configArgs;
  pluginConfigArgs.subcommand = 'plugin';
  pluginConfigArgs.pluginCommand = 'install';
  pluginConfigArgs.plugin = pluginName;
  await runExtensionCommand(pluginConfigArgs, pluginConfig);
}
