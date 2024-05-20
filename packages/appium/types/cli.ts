import {DriverType, PluginType, ServerArgs} from '@appium/types';
import {SetOptional} from 'type-fest';
import {InstallType} from './manifest';
export type CliCommandServer = 'server';
export type CliCommandSetup = 'setup';
export type CliCommandDriver = DriverType;
export type CliCommandPlugin = PluginType;

/**
 * Extension-specific commands
 */
export type CliExtensionCommand = CliCommandDriver | CliCommandPlugin;

/**
 * Possible commands for the `appium` CLI.
 */
export type CliCommand = CliCommandServer | CliExtensionCommand | CliCommandSetup;

/**
 * Possible subcommands of {@linkcode CliCommandSetup}.
 * The command name will be preset name to get drivers/plugins to be installed.
 */
export type CliCommandSetupSubcommand = 'mobile' | 'browser' | 'desktop';

/**
 * Possible subcommands of {@linkcode CliCommandDriver} or
 * {@linkcode CliCommandPlugin}.
 */
export type CliExtensionSubcommand = 'install' | 'list' | 'run' | 'uninstall' | 'update'| 'doctor';

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
   * Possible subcommands. If empty, defaults to {@linkcode CliCommandServer}.
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
   * If true, show the server debug info and exit
   */
  showDebugInfo?: boolean;

  /**
   * If true, open a REPL
   */
  shell?: boolean;
}

/**
 * These arguments are not necessarily supported by the CLI, but via programmatic usage / tests.
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

  /**
   * If true, show debug info and exit
   */
  showDebugInfo?: boolean;
}

export interface DriverExtArgs {
  driverCommand: CliExtensionSubcommand;
  driver?: string;
}

export interface PluginExtArgs {
  pluginCommand: CliExtensionSubcommand;
  plugin?: string;
}

export interface SetupArgs {
  setupCommand?: CliCommandSetupSubcommand;
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
  SubCmd extends CliExtensionSubcommand | CliCommandSetupSubcommand
> = BaseExtArgs<Cmd> &
  (Cmd extends CliCommandSetup
    ? SetupArgs
    : Cmd extends CliCommandDriver
    ? DriverExtArgs
    : Cmd extends CliCommandPlugin
    ? PluginExtArgs
    : never) &
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
  Cmd extends CliCommand = CliCommandServer,
  SubCmd extends CliExtensionSubcommand | CliCommandSetupSubcommand | void = void
> = MoreArgs &
  ProgrammaticArgs &
  (Cmd extends CliCommandServer
    ? ServerArgs
    : Cmd extends CliCommandSetup
    ? SetupArgs
    : Cmd extends CliExtensionCommand
    ? SubCmd extends CliExtensionSubcommand | CliCommandSetupSubcommand
      ? ExtArgs<Cmd, SubCmd>
      : never
    : never);

/**
 * Fully-parsed arguments, containing defaults, computed args, and config file values.
 */
export type ParsedArgs<
  Cmd extends CliCommand = CliCommandServer,
  SubCmd extends CliExtensionSubcommand | CliCommandSetupSubcommand | void = void
> = CommonArgs<Cmd, SubCmd>;

/**
 * Like {@linkcode ParsedArgs} except server arguments are all optional.
 *
 * _May_ have defaults applied; _may_ contain config values; _may_ contain computed args.
 */
export type Args<
  Cmd extends CliCommand = CliCommandServer,
  SubCmd extends CliExtensionSubcommand | CliCommandSetupSubcommand | void = void
> = Cmd extends CliCommandServer
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
