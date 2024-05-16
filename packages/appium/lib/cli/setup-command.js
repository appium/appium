import _ from 'lodash';
import { KNOWN_DRIVERS, KNOWN_PLUGINS, SETUP_SUBCOMMAND } from '../constants';
import {runExtensionCommand} from './extension';

const DEFAULT_DRIVERS = ['uiautomator2', 'xcuitest'];
const DEFAULT_PLUGINS = ['images'];

const SUBCOMMAND_ALL = 'all';

export async function setupCommand(appiumHome, configArgs, driverConfig, pluginConfig) {
  if (!_.isEmpty(driverConfig.installedExtensions) || !_.isEmpty(pluginConfig.installedExtensions)) {
    throw new Error(`'${SETUP_SUBCOMMAND}' will not run because '${appiumHome}' already has drivers: ${
      _.isEmpty(driverConfig.installedExtensions)
      ? '(no drivers)'
      : _.join(_.keys(driverConfig.installedExtensions), ',')
    }, plugins: ${
      _.isEmpty(pluginConfig.installedExtensions)
      ? '(no plugins)'
      : _.join(_.keys(pluginConfig.installedExtensions), ',')
    }`);
  }

  if (configArgs.setupCommand == SUBCOMMAND_ALL) {
    await setupDriverFull(configArgs, driverConfig);
    await setupPluginFull(configArgs, pluginConfig);
    return;
  }

  await setupDriverDefault(configArgs, driverConfig);
  await setupPluginDefault(configArgs, pluginConfig);
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
