/* eslint-disable no-console */
import type {Class, DriverType, ExtensionType, PluginType} from '@appium/types';
import type {Args, CliExtensionCommand, CliExtensionSubcommand} from 'appium/types/index.js';

import {DRIVER_TYPE, PLUGIN_TYPE} from '../constants.js';
import type {ExtensionConfig} from '../extension/extension-config.js';
import {reloadManifest} from '../extension/index.js';
import {isExtensionCommandArgs} from '../schema/cli-args-guards.js';
import {withManifestLock} from '../utils/index.js';
import DriverCliCommand from './driver-command.js';
import PluginCliCommand from './plugin-command.js';
import {errAndQuit, JSON_SPACES} from './utils.js';

export const commandClasses = Object.freeze({
  [DRIVER_TYPE]: DriverCliCommand,
  [PLUGIN_TYPE]: PluginCliCommand,
} as const);

export type ExtCommand<ExtType extends ExtensionType> = ExtType extends DriverType
  ? Class<DriverCliCommand>
  : ExtType extends PluginType
    ? Class<PluginCliCommand>
    : never;

/**
 * Executes a driver/plugin extension subcommand and returns the command result.
 *
 * When JSON output is enabled, this also prints the serialized command result
 * unless output was suppressed by the caller.
 */
export async function runExtensionCommand<Cmd extends CliExtensionCommand, SubCmd extends CliExtensionSubcommand>(
  args: Args<Cmd, SubCmd>,
  config: ExtensionConfig<Cmd>,
) {
  const {extensionType: type} = config; // NOTE this is the same as `args.subcommand`
  if (!isExtensionCommandArgs(args)) {
    throw new TypeError(`Cannot call ${type} command without a subcommand like 'install'`);
  }
  let {json} = args;
  const {suppressOutput} = args;
  json = Boolean(json);
  if (suppressOutput) {
    json = true;
  }

  // Serialize this against any other `driver`/`plugin` CLI command running (in this or another
  // process) against the same `APPIUM_HOME`, so concurrent commands can't race to read, mutate,
  // and write the same extension manifest out from under each other.
  return withManifestLock<Record<string, unknown>>(config.appiumHome, async () => {
    // Refresh from disk while holding the lock, in case another process wrote to the manifest
    // between this process's startup read and now, and revalidate so derived state (installed
    // extensions, pending validation summary, duplicate-automationName tracking) is current too.
    await reloadManifest(config.manifest);

    let jsonResult: Record<string, unknown> = {};
    const CommandClass = commandClasses[type] as ExtCommand<Cmd>;
    const cmd = new CommandClass({config, json} as any);
    cmd.printPendingValidationSummary();
    try {
      jsonResult = (await cmd.execute(args)) as Record<string, unknown>;
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
  });
}
