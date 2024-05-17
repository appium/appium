import _ from 'lodash';
import { SETUP_SUBCOMMAND } from '../constants';
import {runExtensionCommand} from './extension';

/**
 * Driver names listed in KNOWN_DRIVERS to install by default.
 */
export const MOBILE_DRIVERS = ['uiautomator2', 'espresso', 'xcuitest'];
export const SUBCOMMAND_MOBILE = 'mobile';


/**
 * Driver names listed in KNOWN_DRIVERS to install by default.
 */
export const DESKTOP_APP_DRIVERS = ['mac2'];
export const SUBCOMMAND_DESKTOP = 'desktop';

/**
 * Driver names listed in KNOWN_DRIVERS to install by default.
 */
export const BROWSER_DRIVERS = ['uiautomator2', 'xcuitest', 'chromium', 'safari', 'gecko'];
export const SUBCOMMAND_BROWSER = 'browser';

/**
 * Plugin names listed in KNOWN_PLUGINS to install by default.
 */
export const DEFAULT_PLUGINS = [];


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

  switch (preConfigArgs.setupCommand) {
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
 * Install drivers listed in DEFAULT_DRIVERS.
 * @template {import('appium/types').CliExtensionCommand} ExtCmd
 * @param {import('../extension/extension-config').ExtensionConfig<ExtCmd>} driverConfig
 */
async function setupDriverMobile(driverConfig) {
  for (const driverName of MOBILE_DRIVERS) {
    await setupDriver(driverName, driverConfig);
  }
}

/**
 * Install all of known drivers listed in BROWSER_DRIVERS.
 * @template {import('appium/types').CliExtensionCommand} ExtCmd
 * @param {import('../extension/extension-config').ExtensionConfig<ExtCmd>} driverConfig
 */
async function setupDriverBrowser(driverConfig) {
  for (const driver of _.keys(BROWSER_DRIVERS)) {
    await setupDriver(driver, driverConfig);
  }
}

/**
 * Install all of known drivers listed in DESKTOP_APP_DRIVERS.
 * @template {import('appium/types').CliExtensionCommand} ExtCmd
 * @param {import('../extension/extension-config').ExtensionConfig<ExtCmd>} driverConfig
 */
async function setupDriverDesktopApp(driverConfig) {
  for (const driver of _.keys(DESKTOP_APP_DRIVERS)) {
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
