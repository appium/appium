import { fs } from '@appium/support';
import { ArgumentParser } from 'argparse';
import B from 'bluebird';
import _ from 'lodash';
import path from 'path';
import { DRIVER_TYPE, PLUGIN_TYPE } from '../extension-config';
import { finalize, parseArgName } from '../schema';
import { rootDir } from '../utils';
import { driverConfig, getExtensionArgs, getServerArgs, pluginConfig } from './args';

function makeDebugParser (parser) {
  parser.exit = (status, message = undefined) => {
    throw new Error(message);
  };
}

/**
 * Given an object full of arguments as returned by `argparser.parse_args`, expand the ones for extensions
 * into a nested object structure.
 *
 * E.g., `{'driver-foo-bar': baz}` becomes `{driver: {foo: {bar: 'baz'}}}`
 * @param {object} args
 * @returns {object}
 */
function unpackExtensionArgDests (args) {
  return _.reduce(args, (unpacked, value, key) => {
    const {extensionName, extensionType, argName} = parseArgName(key);
    const keyPath = extensionName && extensionType
      ? `${extensionType}.${extensionName}.${argName}`
      : argName;
    _.set(unpacked, keyPath, value);
    return unpacked;
  }, {});
}

async function getParser (debug = false) {
  const parser = new ArgumentParser({
    add_help: true,
    description: 'A webdriver-compatible server for use with native and hybrid iOS and Android applications.',
    prog: process.argv[1] ? path.basename(process.argv[1]) : 'appium',
  });
  if (debug) {
    makeDebugParser(parser);
  }
  parser.add_argument('-v', '--version', {
    action: 'version',
    version: fs.readPackageJsonFrom(rootDir).version
  });
  const subParsers = parser.add_subparsers({dest: 'subcommand'});

  await B.all([driverConfig.read(), pluginConfig.read()]);
  finalize();
  // add the 'server' subcommand, and store the raw arguments on the parser
  // object as a way for other parts of the code to work with the arguments
  // conceptually rather than just through argparse
  const serverArgs = addServerToParser(subParsers, debug);
  parser.rawArgs = serverArgs;

  // add the 'driver' and 'plugin' subcommands
  addExtensionCommandsToParser(subParsers, debug);

  // modify the parse_args function to insert the 'server' subcommand if the
  // user hasn't specified a subcommand or the global help command
  parser._parse_args = parser.parse_args.bind(parser);
  parser.parse_args = function (args, namespace) {
    if (_.isUndefined(args)) {
      args = process.argv.slice(2);
    }
    if (!_.includes([DRIVER_TYPE, PLUGIN_TYPE, 'server', '-h', '--help', '-v', '--version'], args[0])) {
      args.splice(0, 0, 'server');
    }
    let result = this._parse_args(args, namespace);

    result = unpackExtensionArgDests(result);
    return result;
  }.bind(parser);
  return parser;
}

function addServerToParser (subParsers, debug = false) {
  const serverParser = subParsers.add_parser('server', {
    add_help: true,
    help: 'Run an Appium server',
  });

  if (debug) {
    makeDebugParser(serverParser);
  }

  const serverArgs = getServerArgs();
  for (const [flagsOrNames, opts] of serverArgs) {
    // add_argument mutates arguments so make copies
    serverParser.add_argument(...flagsOrNames, {...opts});
  }

  return serverArgs;
}

function addExtensionCommandsToParser (subParsers, debug = false) {
  for (const type of [DRIVER_TYPE, PLUGIN_TYPE]) {
    const extParser = subParsers.add_parser(type, {
      add_help: true,
      help: `Access the ${type} management CLI commands`,
    });
    if (debug) {
      makeDebugParser(extParser);
    }
    const extSubParsers = extParser.add_subparsers({
      dest: `${type}Command`,
    });
    const extensionArgs = getExtensionArgs();
    const parserSpecs = [
      {command: 'list', args: extensionArgs[type].list,
       help: `List available and installed ${type}s`},
      {command: 'install', args: extensionArgs[type].install,
       help: `Install a ${type}`},
      {command: 'uninstall', args: extensionArgs[type].uninstall,
       help: `Uninstall a ${type}`},
      {command: 'update', args: extensionArgs[type].update,
       help: `Update installed ${type}s to the latest version`},
      {command: 'run', args: extensionArgs[type].run,
       help: `Run a script (defined inside the ${type}'s package.json under the ` +
             `“scripts” field inside the “appium” field) from an installed ${type}`}
    ];

    for (const {command, args, help} of parserSpecs) {
      const parser = extSubParsers.add_parser(command, {help});
      if (debug) {
        makeDebugParser(parser);
      }
      for (const [flagsOrNames, opts] of args) {
        // add_argument mutates params so make sure to send in copies instead
        parser.add_argument(...flagsOrNames, {...opts});
      }
    }
  }
}

export default getParser;
export { getParser };
