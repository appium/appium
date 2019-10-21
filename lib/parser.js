import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import { ArgumentParser } from 'argparse';
import { addDriverToParser } from './driver-parser';
import { rootDir } from './utils';
import { DEFAULT_BASE_PATH } from 'appium-base-driver';

const args = [
  [['--shell'], {
    required: false,
    defaultValue: null,
    help: 'Enter REPL mode',
    nargs: 0,
    dest: 'shell',
  }],

  [['--allow-cors'], {
    required: false,
    defaultValue: false,
    action: 'storeTrue',
    help: 'Whether the Appium server should allow web browser connections from any host',
    nargs: 0,
    dest: 'allowCors',
  }],

  [['--reboot'], {
    defaultValue: false,
    dest: 'reboot',
    action: 'storeTrue',
    required: false,
    help: '(Android-only) reboot emulator after each session and kill it at the end',
    nargs: 0,
  }],

  [['-a', '--address'], {
    defaultValue: '0.0.0.0',
    required: false,
    example: '0.0.0.0',
    help: 'IP Address to listen on',
    dest: 'address',
  }],

  [['-p', '--port'], {
    defaultValue: 4723,
    required: false,
    type: 'int',
    example: '4723',
    help: 'port to listen on',
    dest: 'port',
  }],

  [['-pa', '--base-path'], {
    required: false,
    defaultValue: DEFAULT_BASE_PATH,
    dest: 'basePath',
    example: '/path/prefix',
    help: 'Base path to use as the prefix for all webdriver routes running' +
          `on this server (default: ${DEFAULT_BASE_PATH})`
  }],

  [['-ca', '--callback-address'], {
    required: false,
    dest: 'callbackAddress',
    defaultValue: null,
    example: '127.0.0.1',
    help: 'callback IP Address (default: same as --address)',
  }],

  [['-cp', '--callback-port'], {
    required: false,
    dest: 'callbackPort',
    defaultValue: null,
    type: 'int',
    example: '4723',
    help: 'callback port (default: same as port)',
  }],

  [['--session-override'], {
    defaultValue: false,
    dest: 'sessionOverride',
    action: 'storeTrue',
    required: false,
    help: 'Enables session override (clobbering)',
    nargs: 0,
  }],

  [['-g', '--log'], {
    defaultValue: null,
    dest: 'logFile',
    required: false,
    example: '/path/to/appium.log',
    help: 'Also send log output to this file',
  }],

  [['--log-level'], {
    choices: [
      'info', 'info:debug', 'info:info', 'info:warn', 'info:error',
      'warn', 'warn:debug', 'warn:info', 'warn:warn', 'warn:error',
      'error', 'error:debug', 'error:info', 'error:warn', 'error:error',
      'debug', 'debug:debug', 'debug:info', 'debug:warn', 'debug:error',
    ],
    defaultValue: 'debug',
    dest: 'loglevel',
    required: false,
    example: 'debug',
    help: 'log level; default (console[:file]): debug[:debug]',
  }],

  [['--log-timestamp'], {
    defaultValue: false,
    required: false,
    help: 'Show timestamps in console output',
    nargs: 0,
    action: 'storeTrue',
    dest: 'logTimestamp',
  }],

  [['--local-timezone'], {
    defaultValue: false,
    required: false,
    help: 'Use local timezone for timestamps',
    nargs: 0,
    action: 'storeTrue',
    dest: 'localTimezone',
  }],

  [['--log-no-colors'], {
    defaultValue: false,
    required: false,
    help: 'Do not use colors in console output',
    nargs: 0,
    action: 'storeTrue',
    dest: 'logNoColors',
  }],

  [['-G', '--webhook'], {
    defaultValue: null,
    required: false,
    example: 'localhost:9876',
    dest: 'webhook',
    help: 'Also send log output to this HTTP listener',
  }],

  [['--nodeconfig'], {
    required: false,
    defaultValue: null,
    dest: 'nodeconfig',
    help: 'Configuration JSON file to register appium with selenium grid',
    example: '/abs/path/to/nodeconfig.json',
  }],

  [['--show-config'], {
    defaultValue: false,
    dest: 'showConfig',
    action: 'storeTrue',
    required: false,
    help: 'Show info about the appium server configuration and exit',
  }],

  [['--no-perms-check'], {
    defaultValue: false,
    dest: 'noPermsCheck',
    action: 'storeTrue',
    required: false,
    help: 'Bypass Appium\'s checks to ensure we can read/write necessary files',
  }],

  [['--strict-caps'], {
    defaultValue: false,
    dest: 'enforceStrictCaps',
    action: 'storeTrue',
    required: false,
    help: 'Cause sessions to fail if desired caps are sent in that Appium ' +
          'does not recognize as valid for the selected device',
    nargs: 0,
  }],

  [['--tmp'], {
    defaultValue: null,
    dest: 'tmpDir',
    required: false,
    help: 'Absolute path to directory Appium can use to manage temporary ' +
          'files, like built-in iOS apps it needs to move around. On *nix/Mac ' +
          'defaults to /tmp, on Windows defaults to C:\\Windows\\Temp',
  }],

  [['--debug-log-spacing'], {
    dest: 'debugLogSpacing',
    defaultValue: false,
    action: 'storeTrue',
    required: false,
    help: 'Add exaggerated spacing in logs to help with visual inspection',
  }],

  [['--long-stacktrace'], {
    dest: 'longStacktrace',
    defaultValue: false,
    required: false,
    action: 'storeTrue',
    help: 'Add long stack traces to log entries. Recommended for debugging only.',
  }],

  [['-dc', '--default-capabilities'], {
    dest: 'defaultCapabilities',
    defaultValue: {},
    type: parseDefaultCaps,
    required: false,
    example: '[ \'{"app": "myapp.app", "deviceName": "iPhone Simulator"}\' ' +
             '| /path/to/caps.json ]',
    help: 'Set the default desired capabilities, which will be set on each ' +
          'session unless overridden by received capabilities.'
  }],

  [['--relaxed-security'], {
    defaultValue: false,
    dest: 'relaxedSecurityEnabled',
    action: 'storeTrue',
    required: false,
    help: 'Disable additional security checks, so it is possible to use some advanced features, provided ' +
          'by drivers supporting this option. Only enable it if all the ' +
          'clients are in the trusted network and it\'s not the case if a client could potentially ' +
          'break out of the session sandbox. Specific features can be overridden by ' +
          'using the --deny-insecure flag',
    nargs: 0
  }],

  [['--allow-insecure'], {
    dest: 'allowInsecure',
    defaultValue: [],
    type: parseSecurityFeatures,
    required: false,
    example: 'execute_driver_script,adb_shell',
    help: 'Set which insecure features are allowed to run in this server\'s sessions. ' +
          'Features are defined on a driver level; see documentation for more details. ' +
          'This should be either a comma-separated list of feature names, or a path to ' +
          'a file where each feature name is on a line. Note that features defined via ' +
          '--deny-insecure will be disabled, even if also listed here.',
  }],

  [['--deny-insecure'], {
    dest: 'denyInsecure',
    defaultValue: [],
    type: parseSecurityFeatures,
    required: false,
    example: 'execute_driver_script,adb_shell',
    help: 'Set which insecure features are not allowed to run in this server\'s sessions. ' +
          'Features are defined on a driver level; see documentation for more details. ' +
          'This should be either a comma-separated list of feature names, or a path to ' +
          'a file where each feature name is on a line. Features listed here will not be ' +
          'enabled even if also listed in --allow-insecure, and even if --relaxed-security ' +
          'is turned on.',
  }],
];

function parseSecurityFeatures (features) {
  const splitter = (splitOn, str) => `${str}`.split(splitOn).map(s => s.trim()).filter(Boolean);
  let parsedFeatures;
  try {
    parsedFeatures = splitter(',', features);
  } catch (err) {
    throw new Error('Could not parse value of --allow/deny-insecure. Should be ' +
                    'a list of strings separated by commas, or a path to a file ' +
                    'listing one feature name per line.');
  }

  if (parsedFeatures.length === 1 && fs.existsSync(parsedFeatures[0])) {
    // we might have a file which is a list of features
    try {
      const fileFeatures = fs.readFileSync(parsedFeatures[0], 'utf8');
      parsedFeatures = splitter('\n', fileFeatures);
    } catch (err) {
      throw new Error(`Attempted to read --allow/deny-insecure feature names ` +
                      `from file ${parsedFeatures[0]} but got error: ${err.message}`);
    }
  }

  return parsedFeatures;
}

function parseDefaultCaps (caps) {
  try {
    // use synchronous file access, as `argparse` provides no way of either
    // awaiting or using callbacks. This step happens in startup, in what is
    // effectively command-line code, so nothing is blocked in terms of
    // sessions, so holding up the event loop does not incur the usual
    // drawbacks.
    if (fs.statSync(caps).isFile()) {
      caps = fs.readFileSync(caps, 'utf8');
    }
  } catch (err) {
    // not a file, or not readable
  }
  caps = JSON.parse(caps);
  if (!_.isPlainObject(caps)) {
    throw 'Invalid format for default capabilities';
  }
  return caps;
}

function getParser (debug = false) {
  const parser = new ArgumentParser({
    version: require(path.resolve(rootDir, 'package.json')).version,
    addHelp: true,
    description: 'A webdriver-compatible server for use with native and hybrid iOS and Android applications.',
    prog: process.argv[1] ? path.basename(process.argv[1]) : 'appium',
    debug
  });
  const subParsers = parser.addSubparsers({dest: 'subcommand'});
  const serverParser = subParsers.addParser('server', {
    addHelp: true,
    help: 'Run an Appium server',
    debug
  });

  parser.rawArgs = args;
  for (const [flags, opts] of args) {
    // addArgument mutates arguments so make copies
    serverParser.addArgument([...flags], {...opts});
  }

  addDriverToParser(subParsers, debug);

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

function getDefaultArgs () {
  let defaults = {};
  for (let [, arg] of args) {
    defaults[arg.dest] = arg.defaultValue;
  }
  return defaults;
}

export default getParser;
export { getDefaultArgs, getParser };
