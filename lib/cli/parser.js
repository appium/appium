import path from 'path';
import _ from 'lodash';
import { ArgumentParser } from 'argparse';
import { sharedArgs, serverArgs, extensionArgs, DRIVER_TYPE, PLUGIN_TYPE } from './args';
import { rootDir } from '../utils';

function getParser (debug = false) {
  const parser = new ArgumentParser({
    version: require(path.resolve(rootDir, 'package.json')).version,
    addHelp: true,
    description: 'A webdriver-compatible server for use with native and hybrid iOS and Android applications.',
    prog: process.argv[1] ? path.basename(process.argv[1]) : 'appium',
    debug
  });
  const subParsers = parser.addSubparsers({dest: 'subcommand', debug});

  // add the 'server' subcommand, and store the raw arguments on the parser
  // object as a way for other parts of the code to work with the arguments
  // conceptually rather than just through argparse
  const serverArgs = addServerToParser(sharedArgs, subParsers, debug);
  parser.rawArgs = serverArgs;

  // add the 'driver' and 'plugin' subcommands
  addExtensionsToParser(sharedArgs, subParsers, debug);

  // modify the parseArgs function to insert the 'server' subcommand if the
  // user hasn't specified a subcommand or the global help command
  parser._parseArgs = parser.parseArgs;
  parser.parseArgs = function (args, namespace) {
    if (_.isUndefined(args)) {
      args = [...process.argv.slice(2)];
    }
    if (!_.includes([DRIVER_TYPE, PLUGIN_TYPE, 'server', '-h'], args[0])) {
      args.splice(0, 0, 'server');
    }
    return this._parseArgs(args, namespace);
  }.bind(parser);
  return parser;
}

function addServerToParser (sharedArgs, subParsers, debug) {
  const serverParser = subParsers.addParser('server', {
    addHelp: true,
    help: 'Run an Appium server',
    debug
  });

  for (const [flags, opts] of [...sharedArgs, ...serverArgs]) {
    // addArgument mutates arguments so make copies
    serverParser.addArgument([...flags], {...opts});
  }

  return serverArgs;
}

function getDefaultServerArgs () {
  let defaults = {};
  for (let [, arg] of serverArgs) {
    defaults[arg.dest] = arg.defaultValue;
  }
  return defaults;
}

function addExtensionsToParser (sharedArgs, subParsers, debug) {
  for (const type of [DRIVER_TYPE, PLUGIN_TYPE]) {
    const extParser = subParsers.addParser(type, {
      addHelp: true,
      help: `Access the ${type} management CLI commands`,
      debug
    });
    const extSubParsers = extParser.addSubparsers({
      dest: `${type}Command`,
      debug
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
      const parser = extSubParsers.addParser(command, {help, debug});
      for (const [flags, opts] of [...sharedArgs, ...args]) {
        // addArgument mutates params so make sure to send in copies instead
        parser.addArgument([...flags], {...opts});
      }
    }
  }
}

export default getParser;
export { getParser, getDefaultServerArgs };
