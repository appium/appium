import _ from 'lodash';
import { KNOWN_DRIVERS, KNOWN_PLUGINS, SETUP_SUBCOMMAND } from "../constants";
import {runExtensionCommand} from './extension';

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


  await setupDriver("uiautomator2", configArgs, driverConfig);
  await setupDriver("xcuitest", configArgs, driverConfig);

  await setupPlugins("images", configArgs, pluginConfig);
};

async function setupDriver(driverName, configArgs, driverConfig) {
  const driverConfigArgs = configArgs;
  driverConfigArgs.subcommand = "driver";
  driverConfigArgs.driverCommand = "install";
  driverConfigArgs.driver = driverName;
  await runExtensionCommand(driverConfigArgs, driverConfig);
}

async function setupPlugins(pluginName, configArgs, pluginConfig) {
  const pluginConfigArgs = configArgs;
  pluginConfigArgs.subcommand = "plugin";
  pluginConfigArgs.pluginCommand = "install";
  pluginConfigArgs.plugin = pluginName;
  await runExtensionCommand(pluginConfigArgs, pluginConfig);
}
