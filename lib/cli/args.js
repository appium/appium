import { DEFAULT_BASE_PATH } from 'appium-base-driver';
import { parseSecurityFeatures, parseDefaultCaps, parseInstallTypes } from './parser-helpers';
import { INSTALL_TYPES, DEFAULT_APPIUM_HOME } from '../driver-config';

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

const serverArgs = [
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

  [['--chromedriver-port'], {
    defaultValue: null,
    dest: 'chromeDriverPort',
    required: false,
    type: 'int',
    example: '9515',
    help: 'Port upon which ChromeDriver will run. If not given, Android driver will pick a random available port.',
  }],

  [['--chromedriver-executable'], {
    defaultValue: null,
    dest: 'chromedriverExecutable',
    required: false,
    help: 'ChromeDriver executable full path',
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

  [['--trace-dir'], {
    defaultValue: null,
    dest: 'traceDir',
    required: false,
    help: 'Absolute path to directory Appium use to save ios instruments ' +
          'traces, defaults to <tmp dir>/appium-instruments',
  }],

  [['--debug-log-spacing'], {
    dest: 'debugLogSpacing',
    defaultValue: false,
    action: 'storeTrue',
    required: false,
    help: 'Add exaggerated spacing in logs to help with visual inspection',
  }],

  [['--suppress-adb-kill-server'], {
    dest: 'suppressKillServer',
    defaultValue: false,
    action: 'storeTrue',
    required: false,
    help: '(Android-only) If set, prevents Appium from killing the adb server instance',
    nargs: 0,
  }],

  [['--long-stacktrace'], {
    dest: 'longStacktrace',
    defaultValue: false,
    required: false,
    action: 'storeTrue',
    help: 'Add long stack traces to log entries. Recommended for debugging only.',
  }],

  [['--webkit-debug-proxy-port'], {
    defaultValue: 27753,
    dest: 'webkitDebugProxyPort',
    required: false,
    type: 'int',
    example: '27753',
    help: '(IOS-only) Local port used for communication with ios-webkit-debug-proxy'
  }],

  [['--webdriveragent-port'], {
    defaultValue: 8100,
    dest: 'wdaLocalPort',
    required: false,
    type: 'int',
    example: '8100',
    help: '(IOS-only, XCUITest-only) Local port used for communication with WebDriverAgent'
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

const globalDriverArgs = [
  [['--json'], {
    required: false,
    defaultValue: false,
    action: 'storeTrue',
    help: 'Use JSON for output format',
    nargs: 0,
    dest: 'json'
  }]
];

const driverListArgs = [
  ...globalDriverArgs,
  [['--installed'], {
    required: false,
    defaultValue: false,
    action: 'storeTrue',
    help: 'List only installed drivers',
    nargs: 0,
    dest: 'showInstalled'
  }],
  [['--updates'], {
    required: false,
    defaultValue: false,
    action: 'storeTrue',
    help: 'Show information about newer versions',
    nargs: 0,
    dest: 'showUpdates'
  }]
];

const driverInstallArgs = [
  ...globalDriverArgs,
  [['driver'], {
    type: 'string',
    example: 'xcuitest',
    help: 'Name of the driver to install',
  }],
  [['--source'], {
    required: false,
    defaultValue: null,
    type: parseInstallTypes,
    help: `Where to look for the driver if it is not one of Appium's verified ` +
          `drivers. Possible values: ${JSON.stringify(INSTALL_TYPES)}`,
    dest: 'installType'
  }],
];

const driverUninstallArgs = [
  ...globalDriverArgs,
  [['driver'], {
    type: 'string',
    example: 'xcuitest',
    help: 'Name of the driver to uninstall',
  }],
];

const driverUpdateArgs = [
  ...globalDriverArgs,
  [['driver'], {
    type: 'string',
    example: 'xcuitest',
    help: 'Name of the driver to update, or the word "all" to update all. To see available updates, run "appium driver list --installed --updates"',
  }],
];

export {
  sharedArgs,
  serverArgs,
  driverListArgs,
  driverInstallArgs,
  driverUninstallArgs,
  driverUpdateArgs,
};
