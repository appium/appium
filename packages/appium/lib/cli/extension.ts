/* eslint-disable no-console */
import type {Class, DriverType, ExtensionType, PluginType} from '@appium/types';
import type {Args, CliExtensionCommand, CliExtensionSubcommand} from 'appium/types';
import type {ExtensionConfig} from '../extension/extension-config';
import {DRIVER_TYPE, PLUGIN_TYPE} from '../constants';
import {isExtensionCommandArgs} from '../schema/cli-args-guards';
import DriverCliCommand from './driver-command';
import PluginCliCommand from './plugin-command';
import {errAndQuit, JSON_SPACES} from './utils';

export const commandClasses = Object.freeze(
  {
    [DRIVER_TYPE]: DriverCliCommand,
    [PLUGIN_TYPE]: PluginCliCommand,
  } as const
);

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
export async function runExtensionCommand<
  Cmd extends CliExtensionCommand,
  SubCmd extends CliExtensionSubcommand,
>(args: Args<Cmd, SubCmd>, config: ExtensionConfig<Cmd>) {
  // TODO driver config file should be locked while any of these commands are
  // running to prevent weird situations
  let jsonResult: Record<string, unknown> = {};
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
  const CommandClass = commandClasses[type] as ExtCommand<Cmd>;
  const cmd = new CommandClass({config, json} as any);
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
}
