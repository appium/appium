import type {
  Args,
  CliCommand,
  CliCommandDriver,
  CliCommandPlugin,
  CliCommandServer,
  CliCommandSetup,
  CliExtensionCommand,
  CliExtensionSubcommand,
  CliCommandSetupSubcommand,
} from 'appium/types';
import {SERVER_SUBCOMMAND, DRIVER_TYPE, PLUGIN_TYPE, SETUP_SUBCOMMAND} from '../constants';

type AnyArgs = Args<CliCommand, CliExtensionSubcommand | CliCommandSetupSubcommand | void>;

/**
 * Type guard: args are for the server command.
 *
 * @param args - Parsed args before full subcommand-specific narrowing
 */
export function isServerCommandArgs(args: AnyArgs): args is Args<CliCommandServer, void> {
  return args.subcommand === SERVER_SUBCOMMAND;
}

/**
 * Type guard: args are for the setup command.
 *
 * @param args - Parsed args before full subcommand-specific narrowing
 */
export function isSetupCommandArgs(
  args: AnyArgs
): args is Args<CliCommandSetup, CliCommandSetupSubcommand> {
  return args.subcommand === SETUP_SUBCOMMAND;
}

/**
 * Type guard: args are for an extension command (driver or plugin).
 *
 * @param args - Parsed args before full subcommand-specific narrowing
 */
export function isExtensionCommandArgs(
  args: AnyArgs
): args is Args<CliExtensionCommand, CliExtensionSubcommand> {
  return args.subcommand === DRIVER_TYPE || args.subcommand === PLUGIN_TYPE;
}

/**
 * Type guard: args are for a driver extension command.
 *
 * @param args - Parsed args before full subcommand-specific narrowing
 */
export function isDriverCommandArgs(
  args: AnyArgs
): args is Args<CliCommandDriver, CliExtensionSubcommand> {
  return args.subcommand === DRIVER_TYPE;
}

/**
 * Type guard: args are for a plugin extension command.
 *
 * @param args - Parsed args before full subcommand-specific narrowing
 */
export function isPluginCommandArgs(
  args: AnyArgs
): args is Args<CliCommandPlugin, CliExtensionSubcommand> {
  return args.subcommand === PLUGIN_TYPE;
}
