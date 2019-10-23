import path from 'path';
import _ from 'lodash';
import { ArgumentParser } from 'argparse';
import { addDriverToParser } from './driver-parser';
import { addServerToParser } from './server-parser';
import { rootDir } from './utils';

const DEFAULT_APPIUM_HOME = path.resolve(process.env.HOME, '.appium');

// sharedArgs will be added to every subcommand
const sharedArgs = [
  [['-ah', '--home', '--appium-home'], {
    required: false,
    defaultValue: process.env.APPIUM_HOME || DEFAULT_APPIUM_HOME,
    help: 'The path to the directory where Appium will keep installed drivers, plugins, and any other metadata necessary for its operation',
    dest: 'appiumHome',
  }],

  [['--log-filters'], {
    dest: 'logFilters',
    defaultValue: null,
    required: false,
    help: 'Set the full path to a JSON file containing one or more log filtering rules',
    example: '/home/rules.json',
  }],
];

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

  // add the 'driver' subcommand
  addDriverToParser(sharedArgs, subParsers, debug);

  // modify the parseArgs function to insert the 'server' subcommand if the
  // user hasn't specified a subcommand or the global help command
  parser._parseArgs = parser.parseArgs;
  parser.parseArgs = function (args, namespace) {
    if (_.isUndefined(args)) {
      args = [...process.argv.slice(2)];
    }
    if (!_.includes(['driver', 'server', '-h'], args[0])) {
      args.splice(0, 0, 'server');
    }
    return this._parseArgs(args, namespace);
  }.bind(parser);
  return parser;
}

export default getParser;
export { getParser, DEFAULT_APPIUM_HOME };
