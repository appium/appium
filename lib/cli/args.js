import { DEFAULT_BASE_PATH } from 'appium-base-driver';
import {
  parseSecurityFeatures, parseDefaultCaps,
  parsePluginNames, parseInstallTypes, parseDriverNames
} from './parser-helpers';
import {
  INSTALL_TYPES, DEFAULT_APPIUM_HOME,
  DRIVER_TYPE, PLUGIN_TYPE
} from '../extension-config';
import {
  DEFAULT_CAPS_ARG, StoreDeprecatedDefaultCapabilityAction
} from './argparse-actions';

const DRIVER_EXAMPLE = 'xcuitest';
const PLUGIN_EXAMPLE = 'find_by_image';
const USE_ALL_PLUGINS = 'all';

// sharedArgs will be added to every subcommand
const sharedArgs = [
  [['-ah', '--home', '--appium-home'], {
    required: false,
    default: process.env.APPIUM_HOME || DEFAULT_APPIUM_HOME,
    help: 'The path to the directory where Appium will keep installed drivers, plugins, and any other metadata necessary for its operation',
    dest: 'appiumHome',
  }],

  [['-aph', '--appium-plugin-home'], {
    required: false,
    default: null,
    help: 'The path to the directory where Appium will keep installed plugins. "--appium-home" is more general configuration. This argument can be used when you want to manage plugins separately.',
    dest: 'appiumPluginHome',
  }],

  [['--log-filters'], {
    dest: 'logFilters',
    default: null,
    required: false,
    action: 'store_true',
    help: 'Set the full path to a JSON file containing one or more log filtering rules',
  }],
];

const serverArgs = [
  [['--shell'], {
    required: false,
    default: null,
    help: 'Enter REPL mode',
    action: 'store_true',
    dest: 'shell',
  }],

  [['--drivers'], {
    required: false,
    default: [],
    help: `A comma-separated list of installed driver names that should be active for this ` +
          `server. All drivers will be active by default.`,
    type: parseDriverNames,
    dest: 'drivers',
  }],

  [['--plugins'], {
    required: false,
    default: [],
    help: `A comma-separated list of installed plugin names that should be active for this ` +
          `server. To activate all plugins, you can use the single string "${USE_ALL_PLUGINS}" ` +
          `as the value (e.g. --plugins=${USE_ALL_PLUGINS})`,
    type: parsePluginNames,
    dest: 'plugins',
  }],

  [['--allow-cors'], {
    required: false,
    default: false,
    action: 'store_true',
    help: 'Whether the Appium server should allow web browser connections from any host',
    dest: 'allowCors',
  }],

  [['--reboot'], {
    default: false,
    dest: 'reboot',
    action: StoreDeprecatedDefaultCapabilityAction,
    required: false,
    help: '(Android-only) reboot emulator after each session and kill it at the end',
  }],

  [['-a', '--address'], {
    default: '0.0.0.0',
    required: false,
    help: 'IP Address to listen on',
    dest: 'address',
  }],

  [['-p', '--port'], {
    default: 4723,
    required: false,
    type: 'int',
    help: 'port to listen on',
    dest: 'port',
  }],

  [['-pa', '--base-path'], {
    required: false,
    default: DEFAULT_BASE_PATH,
    dest: 'basePath',
    help: 'Base path to use as the prefix for all webdriver routes running ' +
          `on this server`
  }],

  [['-ka', '--keep-alive-timeout'], {
    required: false,
    default: null,
    dest: 'keepAliveTimeout',
    type: 'int',
    help: 'Number of seconds the Appium server should apply as both the keep-alive timeout ' +
          'and the connection timeout for all requests. Defaults to 600 (10 minutes).'
  }],

  [['-ca', '--callback-address'], {
    required: false,
    dest: 'callbackAddress',
    default: null,
    help: 'callback IP Address (default: same as --address)',
  }],

  [['-cp', '--callback-port'], {
    required: false,
    dest: 'callbackPort',
    default: null,
    type: 'int',
    help: 'callback port (default: same as port)',
  }],

  [['--session-override'], {
    default: false,
    dest: 'sessionOverride',
    action: 'store_true',
    required: false,
    help: 'Enables session override (clobbering)',
  }],

  [['-g', '--log'], {
    default: null,
    dest: 'logFile',
    required: false,
    help: 'Also send log output to this file',
  }],

  [['--log-level'], {
    choices: [
      'info', 'info:debug', 'info:info', 'info:warn', 'info:error',
      'warn', 'warn:debug', 'warn:info', 'warn:warn', 'warn:error',
      'error', 'error:debug', 'error:info', 'error:warn', 'error:error',
      'debug', 'debug:debug', 'debug:info', 'debug:warn', 'debug:error',
    ],
    default: 'debug',
    dest: 'loglevel',
    required: false,
    help: 'log level; default (console[:file]): debug[:debug]',
  }],

  [['--log-timestamp'], {
    default: false,
    required: false,
    help: 'Show timestamps in console output',
    action: 'store_true',
    dest: 'logTimestamp',
  }],

  [['--local-timezone'], {
    default: false,
    required: false,
    help: 'Use local timezone for timestamps',
    action: 'store_true',
    dest: 'localTimezone',
  }],

  [['--log-no-colors'], {
    default: false,
    required: false,
    help: 'Do not use colors in console output',
    action: 'store_true',
    dest: 'logNoColors',
  }],

  [['-G', '--webhook'], {
    default: null,
    required: false,
    dest: 'webhook',
    help: 'Also send log output to this HTTP listener, for example localhost:9876',
  }],

  [['--nodeconfig'], {
    required: false,
    default: null,
    dest: 'nodeconfig',
    help: 'Configuration JSON file to register appium with selenium grid',
  }],

  [['--chromedriver-port'], {
    default: null,
    dest: 'chromeDriverPort',
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    type: 'int',
    help: 'Port upon which ChromeDriver will run. If not given, Android driver will pick a random available port.',
  }],

  [['--chromedriver-executable'], {
    default: null,
    dest: 'chromedriverExecutable',
    action: StoreDeprecatedDefaultCapabilityAction,
    required: false,
    help: 'ChromeDriver executable full path',
  }],

  [['--show-config'], {
    default: false,
    dest: 'showConfig',
    action: 'store_true',
    required: false,
    help: 'Show info about the appium server configuration and exit',
  }],

  [['--no-perms-check'], {
    default: false,
    dest: 'noPermsCheck',
    action: 'store_true',
    required: false,
    help: 'Bypass Appium\'s checks to ensure we can read/write necessary files',
  }],

  [['--strict-caps'], {
    default: false,
    dest: 'enforceStrictCaps',
    action: 'store_true',
    required: false,
    help: 'Cause sessions to fail if desired caps are sent in that Appium ' +
          'does not recognize as valid for the selected device',
  }],

  [['--tmp'], {
    default: null,
    dest: 'tmpDir',
    required: false,
    help: 'Absolute path to directory Appium can use to manage temporary ' +
          'files, like built-in iOS apps it needs to move around. On *nix/Mac ' +
          'defaults to /tmp, on Windows defaults to C:\\Windows\\Temp',
  }],

  [['--trace-dir'], {
    default: null,
    dest: 'traceDir',
    required: false,
    help: 'Absolute path to directory Appium use to save ios instruments ' +
          'traces, defaults to <tmp dir>/appium-instruments',
  }],

  [['--debug-log-spacing'], {
    dest: 'debugLogSpacing',
    default: false,
    action: 'store_true',
    required: false,
    help: 'Add exaggerated spacing in logs to help with visual inspection',
  }],

  [['--suppress-adb-kill-server'], {
    dest: 'suppressKillServer',
    default: false,
    action: 'store_true',
    required: false,
    help: '(Android-only) If set, prevents Appium from killing the adb server instance',
  }],

  [['--long-stacktrace'], {
    dest: 'longStacktrace',
    default: false,
    required: false,
    action: 'store_true',
    help: 'Add long stack traces to log entries. Recommended for debugging only.',
  }],

  [['--webkit-debug-proxy-port'], {
    default: 27753,
    dest: 'webkitDebugProxyPort',
    action: StoreDeprecatedDefaultCapabilityAction,
    required: false,
    type: 'int',
    help: '(IOS-only) Local port used for communication with ios-webkit-debug-proxy'
  }],

  [['--webdriveragent-port'], {
    default: 8100,
    dest: 'wdaLocalPort',
    action: StoreDeprecatedDefaultCapabilityAction,
    required: false,
    type: 'int',
    help: '(IOS-only, XCUITest-only) Local port used for communication with WebDriverAgent'
  }],

  [['-dc', DEFAULT_CAPS_ARG], {
    dest: 'defaultCapabilities',
    default: {},
    type: parseDefaultCaps,
    required: false,
    help: 'Set the default desired capabilities, which will be set on each ' +
          'session unless overridden by received capabilities. For example: ' +
          '[ \'{"app": "myapp.app", "deviceName": "iPhone Simulator"}\' ' +
          '| /path/to/caps.json ]'
  }],

  [['--relaxed-security'], {
    default: false,
    dest: 'relaxedSecurityEnabled',
    action: 'store_true',
    required: false,
    help: 'Disable additional security checks, so it is possible to use some advanced features, provided ' +
          'by drivers supporting this option. Only enable it if all the ' +
          'clients are in the trusted network and it\'s not the case if a client could potentially ' +
          'break out of the session sandbox. Specific features can be overridden by ' +
          'using the --deny-insecure flag',
  }],

  [['--allow-insecure'], {
    dest: 'allowInsecure',
    default: [],
    type: parseSecurityFeatures,
    required: false,
    help: 'Set which insecure features are allowed to run in this server\'s sessions. ' +
          'Features are defined on a driver level; see documentation for more details. ' +
          'This should be either a comma-separated list of feature names, or a path to ' +
          'a file where each feature name is on a line. Note that features defined via ' +
          '--deny-insecure will be disabled, even if also listed here.',
  }],

  [['--deny-insecure'], {
    dest: 'denyInsecure',
    default: [],
    type: parseSecurityFeatures,
    required: false,
    help: 'Set which insecure features are not allowed to run in this server\'s sessions. ' +
          'Features are defined on a driver level; see documentation for more details. ' +
          'This should be either a comma-separated list of feature names, or a path to ' +
          'a file where each feature name is on a line. Features listed here will not be ' +
          'enabled even if also listed in --allow-insecure, and even if --relaxed-security ' +
          'is turned on. For example: execute_driver_script,adb_shell',
  }],
];

// this set of args works for both drivers and plugins ('extensions')
const globalExtensionArgs = [
  [['--json'], {
    required: false,
    default: false,
    action: 'store_true',
    help: 'Use JSON for output format',
    dest: 'json'
  }]
];

const extensionArgs = {[DRIVER_TYPE]: {}, [PLUGIN_TYPE]: {}};

function makeListArgs (type) {
  return [
    ...globalExtensionArgs,
    [['--installed'], {
      required: false,
      default: false,
      action: 'store_true',
      help: `List only installed ${type}s`,
      dest: 'showInstalled'
    }],
    [['--updates'], {
      required: false,
      default: false,
      action: 'store_true',
      help: 'Show information about newer versions',
      dest: 'showUpdates'
    }]
  ];
}


function makeInstallArgs (type) {
  return [
    ...globalExtensionArgs,
    [[type], {
      type: 'str',
      help: `Name of the ${type} to install, for example: ` +
            type === DRIVER_TYPE ? DRIVER_EXAMPLE : PLUGIN_EXAMPLE,
    }],
    [['--source'], {
      required: false,
      default: null,
      type: parseInstallTypes,
      help: `Where to look for the ${type} if it is not one of Appium's verified ` +
            `${type}s. Possible values: ${JSON.stringify(INSTALL_TYPES)}`,
      dest: 'installType'
    }],
    [['--package'], {
      required: false,
      default: null,
      type: 'str',
      help: `If installing from Git or GitHub, the package name, as defined in the plugin's ` +
            `package.json file in the "name" field, cannot be determined automatically, and ` +
            `should be reported here, otherwise the install will probably fail.`,
      dest: 'packageName',
    }],
  ];
}

function makeUninstallArgs (type) {
  return [
    ...globalExtensionArgs,
    [[type], {
      type: 'str',
      help: 'Name of the driver to uninstall, for example: ' +
            type === DRIVER_TYPE ? DRIVER_EXAMPLE : PLUGIN_EXAMPLE
    }],
  ];
}

function makeUpdateArgs (type) {
  return [
    ...globalExtensionArgs,
    [[type], {
      type: 'str',
      help: `Name of the ${type} to update, or the word "installed" to update all installed ` +
            `${type}s. To see available updates, run "appium ${type} list --installed --updates". ` +
            'For example: ' + type === DRIVER_TYPE ? DRIVER_EXAMPLE : PLUGIN_EXAMPLE,
    }],
    [['--unsafe'], {
      required: false,
      default: false,
      action: 'store_true',
      help: `Include updates that might have a new major revision, and potentially include ` +
            `breaking changes`,
    }],
  ];
}

for (const type of [DRIVER_TYPE, PLUGIN_TYPE]) {
  extensionArgs[type].list = makeListArgs(type);
  extensionArgs[type].install = makeInstallArgs(type);
  extensionArgs[type].uninstall = makeUninstallArgs(type);
  extensionArgs[type].update = makeUpdateArgs(type);
}

export {
  sharedArgs,
  serverArgs,
  extensionArgs,
  USE_ALL_PLUGINS,
};
