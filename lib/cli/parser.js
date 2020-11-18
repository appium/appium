import path from 'path';
import _ from 'lodash';
import { ArgumentParser } from 'argparse';
import { sharedArgs, serverArgs, extensionArgs } from './args';
import { DRIVER_TYPE, PLUGIN_TYPE } from '../extension-config';
import { rootDir } from '../utils';


function makeDebugParser (parser) {
  parser.exit = (status, message = undefined) => {
    throw new Error(message);
  };
}

function getParser (debug = false) {
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
    version: require(path.resolve(rootDir, 'package.json')).version
  });
  const subParsers = parser.add_subparsers({dest: 'subcommand'});

  // add the 'server' subcommand, and store the raw arguments on the parser
  // object as a way for other parts of the code to work with the arguments
  // conceptually rather than just through argparse
  const serverArgs = addServerToParser(sharedArgs, subParsers, debug);
  parser.rawArgs = serverArgs;

  // add the 'driver' and 'plugin' subcommands
  addExtensionsToParser(sharedArgs, subParsers, debug);

  // modify the parse_args function to insert the 'server' subcommand if the
  // user hasn't specified a subcommand or the global help command
  parser._parse_args = parser.parse_args;
  parser.parse_args = function (args, namespace) {
    if (_.isUndefined(args)) {
      args = [...process.argv.slice(2)];
    }
    if (!_.includes([DRIVER_TYPE, PLUGIN_TYPE, 'server', '-h'], args[0])) {
      args.splice(0, 0, 'server');
    }
    return this._parse_args(args, namespace);
  }.bind(parser);
  return parser;
}

function addServerToParser (sharedArgs, subParsers, debug = false) {
  const serverParser = subParsers.add_parser('server', {
    add_help: true,
    help: 'Run an Appium server',
  });

  if (debug) {
    makeDebugParser(serverParser);
  }

  for (const [flagsOrNames, opts] of [...sharedArgs, ...serverArgs]) {
    // add_argument mutates arguments so make copies
    serverParser.add_argument(...flagsOrNames, {...opts});
  }

  return serverArgs;
}

function getDefaultServerArgs () {
  let defaults = {};
  for (let [, arg] of serverArgs) {
    defaults[arg.dest] = arg.default;
  }
  return defaults;
}

function addExtensionsToParser (sharedArgs, subParsers, debug = false) {
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
    const parserSpecs = [
      {command: 'list', args: extensionArgs[type].list,
       help: `List available and installed ${type}s`},
      {command: 'install', args: extensionArgs[type].install,
       help: `Install a ${type}`},
      {command: 'uninstall', args: extensionArgs[type].uninstall,
       help: `Uninstall a ${type}`},
      {command: 'update', args: extensionArgs[type].update,
       help: `Update installed ${type}s to the latest version`},
    ];

    for (const {command, args, help} of parserSpecs) {
      const parser = extSubParsers.add_parser(command, {help});
      if (debug) {
        makeDebugParser(parser);
      }
      for (const [flagsOrNames, opts] of [...sharedArgs, ...args]) {
        // add_argument mutates params so make sure to send in copies instead
        parser.add_argument(...flagsOrNames, {...opts});
      }
    }
  }
}

export default getParser;
export { getParser, getDefaultServerArgs };
