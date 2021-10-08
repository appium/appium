/* eslint-disable no-console */

import DriverCommand from './driver-command';
import PluginCommand from './plugin-command';
import DriverConfig from '../driver-config';
import PluginConfig from '../plugin-config';
import { DRIVER_TYPE } from '../extension-config';
import { errAndQuit, log, JSON_SPACES } from './utils';
import { APPIUM_HOME } from './args';

/**
 * Run a subcommand of the 'appium driver' type. Each subcommand has its own set of arguments which
 * can be represented as a JS object.
 *
 * @param {Object} args - JS object where the key is the parameter name (as defined in
 * driver-parser.js)
 * @param {import('../ext-config-io').ExtensionType} type - Extension type
 * @oaram {ExtensionConfig} [configObject] - Extension config object, if we have one
 */
async function runExtensionCommand (args, type, configObject) {
  // TODO driver config file should be locked while any of these commands are
  // running to prevent weird situations
  let jsonResult = null;
  const extCmd = args[`${type}Command`];
  if (!extCmd) {
    throw new TypeError(`Cannot call ${type} command without a subcommand like 'install'`);
  }
  let {json, suppressOutput} = args;
  if (suppressOutput) {
    json = true;
  }
  const logFn = (msg) => log(json, msg);
  let config;
  if (configObject) {
    config = configObject;
    config.log = logFn;
  } else {
    const ConfigClass = type === DRIVER_TYPE ? DriverConfig : PluginConfig;
    config = new ConfigClass(APPIUM_HOME, logFn);
  }
  const CommandClass = type === DRIVER_TYPE ? DriverCommand : PluginCommand;
  const cmd = new CommandClass({config, json});
  try {
    await config.read();
    jsonResult = await cmd.execute(args);
  } catch (err) {
    // in the suppress output case, we are calling this function internally and should
    // just throw instead of printing an error and ending the process
    if (suppressOutput) {
      throw err;
    }
    errAndQuit(json, err);
  }

  if (json && !suppressOutput) {
    console.log(JSON.stringify(jsonResult, null, JSON_SPACES));
  }

  return jsonResult;
}

export {
  runExtensionCommand,
};
