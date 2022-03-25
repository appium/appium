import { DriverOpts } from '@appium/types';
import {
  DRIVER_TYPE as DRIVER_SUBCOMMAND,
  EXT_SUBCOMMAND_INSTALL,
  EXT_SUBCOMMAND_LIST,
  EXT_SUBCOMMAND_RUN,
  EXT_SUBCOMMAND_UNINSTALL,
  EXT_SUBCOMMAND_UPDATE,
  PLUGIN_TYPE as PLUGIN_SUBCOMMAND,
  SERVER_SUBCOMMAND,
} from '../lib/constants';

/**
 * Possible subcommands for the `appium` CLI.
 */
type CliSubcommand =
  | typeof SERVER_SUBCOMMAND
  | typeof DRIVER_SUBCOMMAND
  | typeof PLUGIN_SUBCOMMAND;

/**
 * Possible subcommands of {@link DRIVER_SUBCOMMAND} or
 * {@link PLUGIN_SUBCOMMAND}.
 */
export type CliExtensionSubcommand =
  | typeof EXT_SUBCOMMAND_INSTALL
  | typeof EXT_SUBCOMMAND_LIST
  | typeof EXT_SUBCOMMAND_RUN
  | typeof EXT_SUBCOMMAND_UPDATE
  | typeof EXT_SUBCOMMAND_UNINSTALL;

/**
 * Random stuff that may appear in the parsed args which has no equivalent in a
 * config file.
 */
interface MoreArgs {
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
interface ProgrammaticArgs {
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
 * These are args that Appium assigns while parsing the args.
 */
interface InternalArgs {
  /**
   * Subcommands of `driver` subcommand
   */
  driverCommand?: CliExtensionSubcommand;

  /**
   * Subcommands of `plugin` subcommand
   */
  pluginCommand?: CliExtensionSubcommand;

  /**
   * Possible subcommands
   */
  subcommand: CliSubcommand;
}

/**
 * The same as {@link ParsedArgs} but with a nullable `subcommand`.
 * This is _not_ the same as `Partial<ParsedArgs>`.
 */
export type PartialArgs = DriverOpts &
  MoreArgs &
  ProgrammaticArgs &
  Partial<InternalArgs>;

/**
 * The Appium configuration as a flattened object, parsed via CLI args _and_ any
 * CLI args unsupported by the config file.
 * @todo Does not make any assumptions about property names derived from
 * extensions.
 */
export type ParsedArgs = DriverOpts &
  MoreArgs &
  ProgrammaticArgs &
  InternalArgs;

/**
 * Shown by `appium --build-info`
 */
export type BuildInfo = {
  version: string;
  'git-sha'?: string;
  built?: number;
};
