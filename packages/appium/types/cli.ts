import {DriverType, PluginType, ServerArgs} from '@appium/types';
import {SetOptional} from 'type-fest';
import {InstallType} from './manifest';
export type ServerCommand = 'server';
export type DriverCommand = DriverType;
export type PluginCommand = PluginType;

/**
 * Extension-specific commands
 */
export type CliExtensionCommand = DriverCommand | PluginCommand;

/**
 * Possible commands for the `appium` CLI.
 */
export type CliCommand = ServerCommand | CliExtensionCommand;

/**
 * Possible subcommands of {@linkcode DriverCommand} or
 * {@linkcode PluginCommand}.
 */
export type CliExtensionSubcommand = 'install' | 'list' | 'run' | 'uninstall' | 'update';

export interface CliExtensionSubcommandListArgs {
  showInstalled?: boolean;
  showUpdates?: boolean;
}

export interface CliExtensionSubcommandInstallArgs {
  installType: InstallType;
  packageName?: string;
}

export interface CliExtensionSubcommandUpdateArgs {
  unsafe?: boolean;
}

/**
 * Random stuff that may appear in the parsed args which has no equivalent in a
 * config file.
 */
export interface MoreArgs {
  /**
   * Possible subcommands. If empty, defaults to {@linkcode ServerCommand}.
   */
  subcommand?: CliCommand;

  /**
   * Path to config file, if any. Does not make sense for this to be allowed in a config file!
   */
  configFile?: string;

  /**
   * If true, show the config and exit
   */
  showConfig?: boolean;

  /**
   * If true, open a REPL
   */
  shell?: boolean;
}

/**
 * These arguments are _not_ supported by the CLI, but only via programmatic usage / tests.
 */
export interface ProgrammaticArgs {
  /**
   * If `true`, throw on error instead of exit.
   */
  throwInsteadOfExit?: boolean;

  /**
   * Seems to only be used in tests or standalone driver calls
   */
  logHandler?: (...args: any[]) => void;

  /**
   * Alternate way to set `APPIUM_HOME` for tests. Since we don't want to muck about
   * with the environment, we just set it here.
   *
   * Setting this means that any discovery of the proper `APPIUM_HOME` path is bypassed
   * and is equivalent to setting `APPIUM_HOME` in the environment.
   */
  appiumHome?: string;

  /**
   * If true, show the {@link BuildInfo build info} and exit
   */
  showBuildInfo?: boolean;

  /**
   * If true, show config and exit
   */
  showConfig?: boolean;
}

export interface DriverExtArgs {
  driverCommand: CliExtensionSubcommand;
  driver?: string;
}

export interface PluginExtArgs {
  pluginCommand: CliExtensionSubcommand;
  plugin?: string;
}

/**
 * These are args which the user will specify if using an extension command
 */
export interface BaseExtArgs<Cmd extends CliExtensionCommand> {
  subcommand: Cmd;

  /**
   * Output JSON instead of human-readable text
   */
  json?: boolean;

  /**
   * Output nothing
   */
  suppressOutput?: boolean;

  /**
   * Extra args to pass to extension scripts
   */
  extraArgs?: string[];
}

/**
 * Args for extension commands; includes a subcommand
 */
export type ExtArgs<
  Cmd extends CliExtensionCommand,
  SubCmd extends CliExtensionSubcommand
> = BaseExtArgs<Cmd> &
  (Cmd extends DriverCommand ? DriverExtArgs : Cmd extends PluginCommand ? PluginExtArgs : never) &
  (SubCmd extends 'install'
    ? CliExtensionSubcommandInstallArgs
    : SubCmd extends 'list'
    ? CliExtensionSubcommandListArgs
    : SubCmd extends 'update'
    ? CliExtensionSubcommandUpdateArgs
    : never);

/**
 * Some generic bits of arguments; should not be used outside this declaration
 */
export type CommonArgs<
  Cmd extends CliCommand = ServerCommand,
  SubCmd extends CliExtensionSubcommand | void = void
> = MoreArgs &
  ProgrammaticArgs &
  (Cmd extends ServerCommand
    ? ServerArgs
    : Cmd extends CliExtensionCommand
    ? SubCmd extends CliExtensionSubcommand
      ? ExtArgs<Cmd, SubCmd>
      : never
    : never);

/**
 * Fully-parsed arguments, containing defaults, computed args, and config file values.
 */
export type ParsedArgs<
  Cmd extends CliCommand = ServerCommand,
  SubCmd extends CliExtensionSubcommand | void = void
> = CommonArgs<Cmd, SubCmd>;

/**
 * Like {@linkcode ParsedArgs} except server arguments are all optional.
 *
 * _May_ have defaults applied; _may_ contain config values; _may_ contain computed args.
 */
export type Args<
  Cmd extends CliCommand = ServerCommand,
  SubCmd extends CliExtensionSubcommand | void = void
> = Cmd extends ServerCommand
  ? SetOptional<CommonArgs<Cmd>, keyof ServerArgs>
  : ParsedArgs<Cmd, SubCmd>;

/**
 * Shown by `appium --build-info`
 */
export type BuildInfo = {
  version: string;
  'git-sha'?: string;
  built?: string;
};
