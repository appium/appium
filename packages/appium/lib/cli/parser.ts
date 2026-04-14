import {fs} from '@appium/support';
import {ArgumentParser} from 'argparse';
import type {SubArgumentParserOptions, SubParser} from 'argparse';
import _ from 'lodash';
import path from 'node:path';
import type {DriverType, PluginType} from '@appium/types';
import type {CliExtensionSubcommand} from 'appium/types';
import {
  DRIVER_TYPE,
  EXT_SUBCOMMAND_DOCTOR,
  EXT_SUBCOMMAND_INSTALL,
  EXT_SUBCOMMAND_LIST,
  EXT_SUBCOMMAND_RUN,
  EXT_SUBCOMMAND_UNINSTALL,
  EXT_SUBCOMMAND_UPDATE,
  PLUGIN_TYPE,
  SERVER_SUBCOMMAND,
  SETUP_SUBCOMMAND
} from '../constants';
import {finalizeSchema, getAllArgSpecs, getArgSpec, hasArgSpec} from '../schema';
import {rootDir} from '../helpers/build';
import {getExtensionArgs, getServerArgs} from './args';
import type {ArgumentDefinitions} from './args';
import {
  DEFAULT_PLUGINS,
  SUBCOMMAND_MOBILE,
  SUBCOMMAND_DESKTOP,
  SUBCOMMAND_BROWSER,
  SUBCOMMAND_RESET,
  getPresetDrivers,
  determinePlatformName
} from './setup-command';

export const EXTRA_ARGS = 'extraArgs';

/**
 * If the parsed args do not contain any of these values, then we
 * will automatically inject the `server` subcommand.
 */
const NON_SERVER_ARGS = Object.freeze(
  new Set([SETUP_SUBCOMMAND, DRIVER_TYPE, PLUGIN_TYPE, SERVER_SUBCOMMAND, '-h', '--help', '-v', '--version'])
);

const version = fs.readPackageJsonFrom(rootDir).version;
type LooseArgsMap = {[key: string]: any};
type TransformedArgsMap = LooseArgsMap & {[EXTRA_ARGS]: string[]};

/**
 * A wrapper around `argparse`
 *
 * - Handles instantiation, configuration, and monkeypatching of an
 *    `ArgumentParser` instance for Appium server and its extensions
 * - Handles error conditions, messages, and exit behavior
 */
export class ArgParser {
  readonly prog: string;
  readonly debug: boolean;
  readonly parser: ArgumentParser;
  readonly rawArgs: ArgumentDefinitions;
  readonly parse_args: ArgParser['parseArgs'];

  /**
   * @param debug - if true, throw instead of exiting on parse errors
   */
  constructor(debug = false) {
    const prog = process.argv[1] ? path.basename(process.argv[1]) : 'appium';
    const parser = new ArgumentParser({
      add_help: true,
      description:
        'A webdriver-compatible server that facilitates automation of web, mobile, and other ' +
        'types of apps across various platforms.',
      prog,
    });

    ArgParser._patchExit(parser);

    this.prog = prog;

    this.debug = debug;

    this.parser = parser;

    parser.add_argument('-v', '--version', {
      action: 'version',
      version,
    });

    const subParsers = parser.add_subparsers({dest: 'subcommand'});

    // add the 'server' subcommand, and store the raw arguments on the parser
    // object as a way for other parts of the code to work with the arguments
    // conceptually rather than just through argparse
    const serverArgs = ArgParser._addServerToParser(subParsers);

    this.rawArgs = serverArgs;

    // add the 'driver' and 'plugin' subcommands
    ArgParser._addExtensionCommandsToParser(subParsers);

    // add the 'setup' command
    ArgParser._addSetupToParser(subParsers);

    // backwards compatibility / drop-in wrapper
    this.parse_args = this.parseArgs;
  }

  /**
   * Parses CLI args and returns Appium's normalized argument object.
   *
   * If no explicit subcommand is provided, this injects `server`.
   * `parse_args` is a backwards-compatible alias of this method.
   */
  parseArgs(args: string[] = process.argv.slice(2)): TransformedArgsMap {
    if (!NON_SERVER_ARGS.has(args[0])) {
      args.unshift(SERVER_SUBCOMMAND);
    }

    try {
      const parsed = this.parser.parse_known_args(args);
      const [knownArgs, unknownArgs] = parsed;
      // XXX: you'd think that argparse, when given an alias for a subcommand,
      // would set this value to the original subcommand name, but it doesn't.
      if (knownArgs?.driverCommand === 'ls') {
        knownArgs.driverCommand = 'list';
      } else if (knownArgs?.pluginCommand === 'ls') {
        knownArgs.pluginCommand = 'list';
      }
      if (
        unknownArgs?.length &&
        (knownArgs.driverCommand === 'run' || knownArgs.pluginCommand === 'run')
      ) {
        return ArgParser._transformParsedArgs(knownArgs, unknownArgs);
      } else if (unknownArgs?.length) {
        throw new Error(`[ERROR] Unrecognized arguments: ${unknownArgs.join(' ')}`);
      }
      return ArgParser._transformParsedArgs(knownArgs);
    } catch (err) {
      if (this.debug) {
        throw err;
      }
      // this isn't tested via unit tests (we use `debug: true`) so may escape coverage.

      /* istanbul ignore next */
      {
        // eslint-disable-next-line no-console
        console.error(); // need an extra space since argparse prints usage.
        // eslint-disable-next-line no-console
        console.error(err.message);
        process.exit(1);
      }
    }
  }

  /**
   * Normalizes server arg keys from schema names to parser destination names.
   *
   * This mutates and returns the same object.
   */
  static normalizeServerArgs<T extends LooseArgsMap>(obj: T): T {
    const mutableObj = obj as LooseArgsMap;
    for (const spec of getAllArgSpecs().values()) {
      if (!spec.extType && mutableObj[spec.name] !== undefined && spec.rawDest !== spec.name) {
        mutableObj[spec.rawDest] = mutableObj[spec.name] ?? mutableObj[spec.rawDest];
        delete mutableObj[spec.name];
      }
    }
    return obj;
  }

  /**
   * Given an object full of arguments as returned by `argparser.parse_args`,
   * expand the ones for extensions into a nested object structure and rename
   * keys to match the intended destination.
   *
   * E.g., `{'driver-foo-bar': baz}` becomes `{driver: {foo: {bar: 'baz'}}}`
   */
  private static _transformParsedArgs(
    args: LooseArgsMap,
    unknownArgs: string[] = []
  ): TransformedArgsMap {
    const result = _.reduce(
      args,
      (unpacked, value, key) => {
        const spec = hasArgSpec(key) ? getArgSpec(key) : undefined;
        if (!_.isUndefined(value) && spec) {
          const {dest} = spec;
          _.set(unpacked, dest, value);
        } else {
          // this could be anything that _isn't_ a server arg
          unpacked[key] = value;
        }
        return unpacked;
      },
      {}
    );
    result[EXTRA_ARGS] = unknownArgs;
    return result as TransformedArgsMap;
  }

  /**
   * Patches the `exit()` method of the parser to throw an error, so we can handle it manually.
   */
  private static _patchExit(parser: ArgumentParser): void {
    parser.exit = (code, msg) => {
      if (code) {
        throw new Error(msg);
      }
      process.exit();
    };
  }

  /**
   * Adds the `server` subcommand parser and returns its argument definitions.
   */
  private static _addServerToParser(subParser: SubParser): ArgumentDefinitions {
    const serverParser = subParser.add_parser('server', {
      add_help: true,
      help: 'Start an Appium server',
      description: 'Start an Appium server (the "server" subcommand is optional)',
    });

    ArgParser._patchExit(serverParser);

    const serverArgs = getServerArgs();
    for (const [flagsOrNames, opts] of serverArgs) {
      // @ts-ignore TS doesn't like the spread operator here.
      serverParser.add_argument(...flagsOrNames, {...opts});
    }

    return serverArgs;
  }

  /**
   * Adds extension sub-sub-commands to `driver`/`plugin` subcommands
   */
  private static _addExtensionCommandsToParser(subParser: SubParser): void {
    for (const type of [DRIVER_TYPE, PLUGIN_TYPE] as [DriverType, PluginType]) {
      const extParser = subParser.add_parser(type, {
        add_help: true,
        help: `Manage Appium ${type}s`,
        description: `Manage Appium ${type}s using various subcommands`,
      });

      ArgParser._patchExit(extParser);

      const extSubParsers = extParser.add_subparsers({
        dest: `${type}Command`,
      });
      const extensionArgs = getExtensionArgs();
      const parserSpecs: {
        command: CliExtensionSubcommand;
        args: ArgumentDefinitions;
        help: string;
        aliases?: SubArgumentParserOptions['aliases'];
      }[] = [
        {
          command: EXT_SUBCOMMAND_LIST,
          args: extensionArgs[type].list,
          help: `List available and installed ${type}s`,
          aliases: ['ls'],
        },
        {
          command: EXT_SUBCOMMAND_INSTALL,
          args: extensionArgs[type].install,
          help: `Install a ${type}`,
        },
        {
          command: EXT_SUBCOMMAND_UNINSTALL,
          args: extensionArgs[type].uninstall,
          help: `Uninstall a ${type}`,
        },
        {
          command: EXT_SUBCOMMAND_UPDATE,
          args: extensionArgs[type].update,
          help: `Update one or more installed ${type}s to the latest version`,
        },
        {
          command: EXT_SUBCOMMAND_RUN,
          args: extensionArgs[type].run,
          help: `Run a script (if available) from the given ${type}`,
        },
        {
          command: EXT_SUBCOMMAND_DOCTOR,
          args: extensionArgs[type].doctor,
          help: `Run doctor checks (if available) for the given ${type}`,
        },
      ];

      for (const {command, args, help, aliases} of parserSpecs) {
        const parser = extSubParsers.add_parser(command, {help, aliases: aliases ?? []});

        ArgParser._patchExit(parser);

        for (const [flagsOrNames, opts] of args) {
          // add_argument mutates params so make sure to send in copies instead
          if (flagsOrNames.length === 2) {
            parser.add_argument(flagsOrNames[0], flagsOrNames[1], {...opts});
          } else {
            parser.add_argument(flagsOrNames[0], {...opts});
          }
        }
      }
    }
  }

  /**
   * Add subcommand and sub-sub commands for 'setup' subcommand.
   */
  private static _addSetupToParser(subParser: SubParser): void {
    const setupParser = subParser.add_parser('setup', {
      add_help: true,
      help: 'Batch install or uninstall Appium drivers and plugins',
      description:
        `Install a preset of official drivers/plugins compatible with the current host platform ` +
        `(${determinePlatformName()}). Existing drivers/plugins will remain. The default preset ` +
        `is "mobile". Providing the special "reset" subcommand will instead uninstall all ` +
        `drivers and plugins, and remove their related manifest files.`,
    });


    ArgParser._patchExit(setupParser);
    const extSubParsers = setupParser.add_subparsers({
      dest: `setupCommand`,
    });

    const parserSpecs = [
      {
        command: SUBCOMMAND_MOBILE,
        help:
          `The preset for mobile devices ` +
          `(drivers: ${_.join(getPresetDrivers(SUBCOMMAND_MOBILE), ',')}; plugins: ${DEFAULT_PLUGINS})`
      },
      {
        command: SUBCOMMAND_BROWSER,
        help:
          `The preset for desktop browsers ` +
          `(drivers: ${_.join(getPresetDrivers(SUBCOMMAND_BROWSER), ',')}; plugins: ${DEFAULT_PLUGINS})`
      },
      {
        command: SUBCOMMAND_DESKTOP,
        help:
          `The preset for desktop applications ` +
          `(drivers: ${_.join(getPresetDrivers(SUBCOMMAND_DESKTOP), ',')}; plugins: ${DEFAULT_PLUGINS})`
      },
      {
        command: SUBCOMMAND_RESET,
        help: 'Remove all installed drivers and plugins'
      },
    ];

    for (const {command, help} of parserSpecs) {
      const parser = extSubParsers.add_parser(command, {help});
      ArgParser._patchExit(parser);
    }
  }
}

/**
 * Creates and returns an `ArgParser` after finalizing schema state.
 */
export async function getParser(debug = false): Promise<ArgParser> {
  await finalizeSchema();

  return new ArgParser(debug);
}
