/* eslint-disable no-console */

import DriverCommand from './driver-command';
import PluginCommand from './plugin-command';
import DriverConfig from '../driver-config';
import PluginConfig from '../plugin-config';
import { DRIVER_TYPE } from '../extension-config';
import { errAndQuit, log, JSON_SPACES } from './utils';

/**
 * Run a subcommand of the 'appium driver' type. Each subcommand has its own set of arguments which
 * can be represented as a JS object.
 *
 * @param {Object} args - JS object where the key is the parameter name (as defined in
 * driver-parser.js)
 */
async function runExtensionCommand (args, type) {
  // TODO driver config file should be locked while any of these commands are
  // running to prevent weird situations
  let jsonResult = null;
  const {json, appiumHome} = args;
  const logFn = (msg) => log(json, msg);
  const ConfigClass = type === DRIVER_TYPE ? DriverConfig : PluginConfig;
  const CommandClass = type === DRIVER_TYPE ? DriverCommand : PluginCommand;
  const config = new ConfigClass(appiumHome, logFn);
  const cmd = new CommandClass({config, json});
  try {
    await config.read();
    jsonResult = await cmd.execute(args);
  } catch (err) {
    errAndQuit(json, err);
  }

  if (json) {
    console.log(JSON.stringify(jsonResult, null, JSON_SPACES));
  }

  return jsonResult;
}

export {
  runExtensionCommand,
};
