import {ServerArgs} from '@appium/types';
export type ServerSubcommand = 'server';
export type DriverSubcommand = 'driver';
export type PluginSubcommand = 'plugin';

/**
 * Possible subcommands for the `appium` CLI.
 */
export type CliSubcommand = ServerSubcommand | DriverSubcommand | PluginSubcommand;

/**
 * Possible subcommands of {@linkcode DriverSubcommand} or
 * {@linkcode PluginSubcommand}.
 */
export type CliExtensionSubcommand =
  | 'install'
  | 'list'
  | 'run'
  | 'uninstall'
  | 'update';

/**
 * Random stuff that may appear in the parsed args which has no equivalent in a
 * config file.
 */
export interface MoreArgs {
  /**
   * Possible subcommands. If empty, defaults to {@linkcode ServerSubcommand}.
   */
  subcommand?: CliSubcommand;

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

/**
 * These are args which the user will specify if using an extension command
 */
export interface ExtArgs extends WithExtSubcommand {
  /**
   * Subcommands of `driver` subcommand
   */
  driverCommand?: CliExtensionSubcommand;

  /**
   * Subcommands of `plugin` subcommand
   */
  pluginCommand?: CliExtensionSubcommand;

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
 * Args having the `server` subcommand
 */
export interface WithServerSubcommand {
  subcommand?: ServerSubcommand;
}

/**
 * Args having the `driver` or `plugin` subcommand
 */
export interface WithExtSubcommand {
  subcommand: DriverSubcommand | PluginSubcommand;
}

/**
 * Some generic bits of arguments; should not be used outside this declaration
 */
type CommonArgs<SArgs, T = WithServerSubcommand> = MoreArgs &
  ProgrammaticArgs &
  (T extends WithServerSubcommand ? SArgs : T extends WithExtSubcommand ? ExtArgs : never);

/**
 * Fully-parsed arguments, containing defaults, computed args, and config file values.
 */
export type ParsedArgs<T = WithServerSubcommand> = CommonArgs<ServerArgs, T>;

/**
 * Partial arguments, as supplied by a user. _May_ have defaults applied; _may_ contain config values; _may_ contain computed args.
 */
export type Args<T = WithServerSubcommand> = CommonArgs<Partial<ServerArgs>, T>;

/**
 * Shown by `appium --build-info`
 */
export type BuildInfo = {
  version: string;
  'git-sha'?: string;
  built?: string;
};
