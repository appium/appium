// @ts-check

import { fs } from '@appium/support';
import { ArgumentParser } from 'argparse';
import B from 'bluebird';
import _ from 'lodash';
import path from 'path';
import { DRIVER_TYPE, PLUGIN_TYPE } from '../extension-config';
import { finalizeSchema, getArgSpec, hasArgSpec } from '../schema';
import { rootDir } from '../utils';
import {
  driverConfig,
  getExtensionArgs,
  getServerArgs,
  pluginConfig
} from './args';

export const SERVER_SUBCOMMAND = 'server';

/**
 * If the parsed args do not contain any of these values, then we
 * will automatially inject the `server` subcommand.
 */
const NON_SERVER_ARGS = Object.freeze(
  new Set([
    DRIVER_TYPE,
    PLUGIN_TYPE,
    SERVER_SUBCOMMAND,
    '-h',
    '--help',
    '-v',
    '--version'
  ])
);

const version = fs.readPackageJsonFrom(rootDir).version;

/**
 * A wrapper around `argparse`
 *
 * - Handles instantiation, configuration, and monkeypatching of an
 *    `ArgumentParser` instance for Appium server and its extensions
 * - Handles error conditions, messages, and exit behavior
 */
class ArgParser {
  /**
   * @param {boolean} [debug] - If true, throw instead of exit on error.
   */
  constructor (debug = false) {
    const prog = process.argv[1] ? path.basename(process.argv[1]) : 'appium';
    const parser = new ArgumentParser({
      add_help: true,
      description:
        'A webdriver-compatible server that facilitates automation of web, mobile, and other types of apps across various platforms.',
      prog,
    });

    ArgParser._patchExit(parser);

    /**
     * Program name (typically `appium`)
     * @type {string}
     */
    this.prog = prog;

    /**
     * If `true`, throw an error on parse failure instead of printing help
     * @type {boolean}
     */
    this.debug = debug;

    /**
     * Wrapped `ArgumentParser` instance
     * @type {ArgumentParser}
     */
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

    // backwards compatibility / drop-in wrapper
    /**
     * @type {ArgParser['parseArgs']}
     */
    this.parse_args = this.parseArgs;
  }

  /**
   * Parse arguments from the command line.
   *
   * If no subcommand is passed in, this method will inject the `server` subcommand.
   *
   * `ArgParser.prototype.parse_args` is an alias of this method.
   * @param {string[]} [args] - Array of arguments, ostensibly from `process.argv`. Gathers args from `process.argv` if not provided.
   * @returns {import('../../types/types').ParsedArgs} - The parsed arguments
   */
  parseArgs (args = process.argv.slice(2)) {
    if (!NON_SERVER_ARGS.has(args[0])) {
      args.unshift(SERVER_SUBCOMMAND);
    }

    try {
      const parsed = this.parser.parse_args(args);
      return ArgParser._transformParsedArgs(parsed);
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
   * Given an object full of arguments as returned by `argparser.parse_args`,
   * expand the ones for extensions into a nested object structure and rename
   * keys to match the intended destination.
   *
   * E.g., `{'driver-foo-bar': baz}` becomes `{driver: {foo: {bar: 'baz'}}}`
   * @param {object} args
   * @returns {object}
   */
  static _transformParsedArgs (args) {
    return _.reduce(
      args,
      (unpacked, value, key) => {
        if (hasArgSpec(key)) {
          const {dest} = /** @type {import('../schema/arg-spec').ArgSpec} */(getArgSpec(key));
          _.set(unpacked, dest, value);
        } else {
          // this could be anything that _isn't_ a server arg
          unpacked[key] = value;
        }
        return unpacked;
      },
      {},
    );
  }

  /**
   * Patches the `exit()` method of the parser to throw an error, so we can handle it manually.
   * @param {ArgumentParser} parser
   */
  static _patchExit (parser) {
    parser.exit = (code, msg) => {
      if (code) {
        throw new Error(msg);
      }
      process.exit();
    };
  }

  /**
   *
   * @param {import('argparse').SubParser} subParser
   * @returns {import('./args').ArgumentDefinitions}
   */
  static _addServerToParser (subParser) {
    const serverParser = subParser.add_parser('server', {
      add_help: true,
      help: 'Run an Appium server',
    });

    ArgParser._patchExit(serverParser);

    const serverArgs = getServerArgs();
    for (const [flagsOrNames, opts] of serverArgs) {
      // TS doesn't like the spread operator here.
      // @ts-ignore
      serverParser.add_argument(...flagsOrNames, {...opts});
    }

    return serverArgs;
  }

  /**
   * Adds extension sub-sub-commands to `driver`/`plugin` subcommands
   * @param {import('argparse').SubParser} subParsers
   */
  static _addExtensionCommandsToParser (subParsers) {
    for (const type of [DRIVER_TYPE, PLUGIN_TYPE]) {
      const extParser = subParsers.add_parser(type, {
        add_help: true,
        help: `Access the ${type} management CLI commands`,
      });

      ArgParser._patchExit(extParser);

      const extSubParsers = extParser.add_subparsers({
        dest: `${type}Command`,
      });
      const extensionArgs = getExtensionArgs();
      const parserSpecs = [
        {
          command: 'list',
          args: extensionArgs[type].list,
          help: `List available and installed ${type}s`,
        },
        {
          command: 'install',
          args: extensionArgs[type].install,
          help: `Install a ${type}`,
        },
        {
          command: 'uninstall',
          args: extensionArgs[type].uninstall,
          help: `Uninstall a ${type}`,
        },
        {
          command: 'update',
          args: extensionArgs[type].update,
          help: `Update installed ${type}s to the latest version`,
        },
        {
          command: 'run',
          args: extensionArgs[type].run,
          help:
            `Run a script (defined inside the ${type}'s package.json under the ` +
            `“scripts” field inside the “appium” field) from an installed ${type}`,
        },
      ];

      for (const {command, args, help} of parserSpecs) {
        const parser = extSubParsers.add_parser(command, {help});

        ArgParser._patchExit(parser);

        for (const [flagsOrNames, opts] of args) {
          // add_argument mutates params so make sure to send in copies instead
          // @ts-ignore
          parser.add_argument(...flagsOrNames, {...opts});
        }
      }
    }
  }
}

/**
 * Creates a {@link ArgParser} instance.  Necessarily reads extension configuration
 * beforehand, and finalizes the config schema.
 *
 * @constructs ArgParser
 * @param {boolean} [debug] - If `true`, throw instead of exit upon parsing error
 * @returns {Promise<ArgParser>}
 */
async function getParser (debug = false) {
  await B.all([driverConfig.read(), pluginConfig.read()]);
  finalizeSchema();

  return new ArgParser(debug);
}

export default getParser;
export { getParser, ArgParser };
