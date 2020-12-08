import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import { ArgumentParser } from 'argparse';
import { rootDir } from './utils';
import { DEFAULT_BASE_PATH } from 'appium-base-driver';
import {
  StoreDeprecatedAction, StoreDeprecatedTrueAction,
  StoreDeprecatedDefaultCapabilityAction, StoreDeprecatedDefaultCapabilityTrueAction,
  DEFAULT_CAPS_ARG,
} from './argsparse-actions';


const args = [
  [['--shell'], {
    required: false,
    default: false,
    action: 'store_true',
    help: 'Enter REPL mode',
    dest: 'shell',
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
    action: 'store_true',
    required: false,
    help: '(Android-only) reboot emulator after each session and kill it at the end',
  }],

  [['--ipa'], {
    required: false,
    default: null,
    help: '(IOS-only) abs path to compiled .ipa file',
    dest: 'ipa',
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
    help: 'Base path to use as the prefix for all webdriver routes running' +
          'on this server'
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

  [['-bp', '--bootstrap-port'], {
    default: 4724,
    dest: 'bootstrapPort',
    required: false,
    type: 'int',
    help: '(Android-only) port to use on device to talk to Appium',
  }],

  [['-r', '--backend-retries'], {
    default: 3,
    dest: 'backendRetries',
    required: false,
    type: 'int',
    help: '(iOS-only) How many times to retry launching Instruments ' +
          'before saying it crashed or timed out',
  }],

  [['--session-override'], {
    default: false,
    dest: 'sessionOverride',
    action: 'store_true',
    required: false,
    help: 'Enables session override (clobbering)',
  }],

  [['-l', '--pre-launch'], {
    default: false,
    dest: 'launch',
    action: 'store_true',
    required: false,
    help: 'Pre-launch the application before allowing the first session ' +
          '(Requires --app and, for Android, --app-pkg and --app-activity)',
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

  [['--safari'], {
    default: false,
    action: 'store_true',
    dest: 'safari',
    required: false,
    help: '(IOS-Only) Use the safari app',
  }],

  [['--default-device', '-dd'], {
    dest: 'defaultDevice',
    default: false,
    action: 'store_true',
    required: false,
    help: '(IOS-Simulator-only) use the default simulator that instruments ' +
          'launches on its own',
  }],

  [['--force-iphone'], {
    default: false,
    dest: 'forceIphone',
    action: 'store_true',
    required: false,
    help: '(IOS-only) Use the iPhone Simulator no matter what the app wants',
  }],

  [['--force-ipad'], {
    default: false,
    dest: 'forceIpad',
    action: 'store_true',
    required: false,
    help: '(IOS-only) Use the iPad Simulator no matter what the app wants',
  }],

  [['--tracetemplate'], {
    default: null,
    dest: 'automationTraceTemplatePath',
    required: false,
    help: '(IOS-only) .tracetemplate file to use with Instruments',
  }],

  [['--instruments'], {
    default: null,
    dest: 'instrumentsPath',
    required: false,
    help: '(IOS-only) path to instruments binary',
  }],

  [['--nodeconfig'], {
    required: false,
    default: null,
    dest: 'nodeconfig',
    help: 'Configuration JSON file to register appium with selenium grid',
  }],

  [['-ra', '--robot-address'], {
    default: '0.0.0.0',
    dest: 'robotAddress',
    required: false,
    help: 'IP Address of robot',
  }],

  [['-rp', '--robot-port'], {
    default: -1,
    dest: 'robotPort',
    required: false,
    type: 'int',
    help: 'port for robot',
  }],

  [['--chromedriver-executable'], {
    default: null,
    dest: 'chromedriverExecutable',
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

  [['--isolate-sim-device'], {
    default: false,
    dest: 'isolateSimDevice',
    action: 'store_true',
    required: false,
    help: 'Xcode 6 has a bug on some platforms where a certain simulator ' +
          'can only be launched without error if all other simulator devices ' +
          'are first deleted. This option causes Appium to delete all ' +
          'devices other than the one being used by Appium. Note that this ' +
          'is a permanent deletion, and you are responsible for using simctl ' +
          'or xcode to manage the categories of devices used with Appium.',
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
    required: false,
    type: 'int',
    help: '(IOS-only) Local port used for communication with ios-webkit-debug-proxy'
  }],

  [['--webdriveragent-port'], {
    default: 8100,
    dest: 'wdaLocalPort',
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
          '--deny-insecure will be disabled, even if also listed here. For example: ' +
          'execute_driver_script,adb_shell',
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

  [['--command-timeout'], {
    default: 60,
    dest: 'defaultCommandTimeout',
    type: 'int',
    required: false,
    deprecated_for: 'newCommandTimeout capability',
    action: StoreDeprecatedAction,
    help: 'No effect. This used to be the default command ' +
          'timeout for the server to use for all sessions (in seconds and ' +
          'should be less than 2147483). Use newCommandTimeout cap instead'
  }],

  [['-k', '--keep-artifacts'], {
    default: false,
    dest: 'keepArtifacts',
    action: StoreDeprecatedTrueAction,
    required: false,
    help: 'No effect, trace is now in tmp dir by default and is ' +
          'cleared before each run. Please also refer to the --trace-dir flag.',
  }],

  [['--platform-name'], {
    dest: 'platformName',
    default: null,
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: 'Name of the mobile platform: iOS, Android, or FirefoxOS',
  }],

  [['--platform-version'], {
    dest: 'platformVersion',
    default: null,
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: 'Version of the mobile platform',
  }],

  [['--automation-name'], {
    dest: 'automationName',
    default: null,
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: 'Name of the automation tool: Appium, XCUITest, etc.',
  }],

  [['--device-name'], {
    dest: 'deviceName',
    default: null,
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: 'Name of the mobile device to use, for example: ' +
          'iPhone Retina (4-inch), Android Emulator',
  }],

  [['--browser-name'], {
    dest: 'browserName',
    default: null,
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: 'Name of the mobile browser: Safari or Chrome',
  }],

  [['--app'], {
    dest: 'app',
    required: false,
    default: null,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: 'IOS: abs path to simulator-compiled .app file or the ' +
          'bundle_id of the desired target on device; Android: abs path to .apk file',
  }],

  [['-lt', '--launch-timeout'], {
    default: 90000,
    dest: 'launchTimeout',
    type: 'int',
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: '(iOS-only) how long in ms to wait for Instruments to launch',
  }],

  [['--language'], {
    default: null,
    dest: 'language',
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: 'Language for the iOS simulator / Android Emulator, like: en, es',
  }],

  [['--locale'], {
    default: null,
    dest: 'locale',
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: 'Locale for the iOS simulator / Android Emulator, like en_US, de_DE',
  }],

  [['-U', '--udid'], {
    dest: 'udid',
    required: false,
    default: null,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: 'Unique device identifier of the connected physical device',
  }],

  [['--orientation'], {
    dest: 'orientation',
    default: null,
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: '(IOS-only) use LANDSCAPE or PORTRAIT to initialize all requests ' +
          'to this orientation',
  }],

  [['--no-reset'], {
    default: false,
    dest: 'noReset',
    action: StoreDeprecatedDefaultCapabilityTrueAction,
    required: false,
    help: 'Do not reset app state between sessions (IOS: do not delete app ' +
          'plist files; Android: do not uninstall app before new session)',
  }],

  [['--full-reset'], {
    default: false,
    dest: 'fullReset',
    action: StoreDeprecatedDefaultCapabilityTrueAction,
    required: false,
    help: '(iOS) Delete the entire simulator folder. (Android) Reset app ' +
          'state by uninstalling app instead of clearing app data. On ' +
          'Android, this will also remove the app after the session is complete.',
  }],

  [['--app-pkg'], {
    dest: 'appPackage',
    default: null,
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: '(Android-only) Java package of the Android app you want to run ' +
          '(e.g., com.example.android.myApp)',
  }],

  [['--app-activity'], {
    dest: 'appActivity',
    default: null,
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: '(Android-only) Activity name for the Android activity you want ' +
          'to launch from your package (e.g., MainActivity)',
  }],

  [['--app-wait-package'], {
    dest: 'appWaitPackage',
    default: false,
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: '(Android-only) Package name for the Android activity you want ' +
          'to wait for (e.g., com.example.android.myApp)',
  }],

  [['--app-wait-activity'], {
    dest: 'appWaitActivity',
    default: false,
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: '(Android-only) Activity name for the Android activity you want ' +
          'to wait for (e.g., SplashActivity)',
  }],

  [['--device-ready-timeout'], {
    dest: 'deviceReadyTimeout',
    default: 5,
    required: false,
    type: 'int',
    action: StoreDeprecatedDefaultCapabilityAction,
    help: '(Android-only) Timeout in seconds while waiting for device to become ready',
  }],

  [['--android-coverage'], {
    dest: 'androidCoverage',
    default: false,
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: '(Android-only) Fully qualified instrumentation class. Passed to -w in ' +
          'adb shell am instrument -e coverage true -w ' +
          '(e.g. com.my.Pkg/com.my.Pkg.instrumentation.MyInstrumentation)',
  }],

  [['--avd'], {
    dest: 'avd',
    default: null,
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: '(Android-only) Name of the avd to launch (e.g. @Nexus_5)',
  }],

  [['--avd-args'], {
    dest: 'avdArgs',
    default: null,
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: '(Android-only) Additional emulator arguments to launch the avd (e.g. -no-snapshot-load)',
  }],

  [['--use-keystore'], {
    default: false,
    dest: 'useKeystore',
    action: StoreDeprecatedDefaultCapabilityTrueAction,
    required: false,
    help: '(Android-only) When set the keystore will be used to sign apks.',
  }],

  [['--keystore-path'], {
    default: path.resolve(process.env.HOME || process.env.USERPROFILE || '', '.android', 'debug.keystore'),
    dest: 'keystorePath',
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: '(Android-only) Path to keystore',
  }],

  [['--keystore-password'], {
    default: 'android',
    dest: 'keystorePassword',
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: '(Android-only) Password to keystore',
  }],

  [['--key-alias'], {
    default: 'androiddebugkey',
    dest: 'keyAlias',
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: '(Android-only) Key alias',
  }],

  [['--key-password'], {
    default: 'android',
    dest: 'keyPassword',
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: '(Android-only) Key password',
  }],

  [['--intent-action'], {
    dest: 'intentAction',
    default: 'android.intent.action.MAIN',
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: '(Android-only) Intent action which will be used to start activity (e.g. android.intent.action.MAIN)',
  }],

  [['--intent-category'], {
    dest: 'intentCategory',
    default: 'android.intent.category.LAUNCHER',
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: '(Android-only) Intent category which will be used to start activity ' +
          '(e.g. android.intent.category.APP_CONTACTS)',
  }],

  [['--intent-flags'], {
    dest: 'intentFlags',
    default: '0x10200000',
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: '(Android-only) Flags that will be used to start activity (e.g. 0x10200000)',
  }],

  [['--intent-args'], {
    dest: 'optionalIntentArguments',
    default: null,
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: '(Android-only) Additional intent arguments that will be used to start activity  (e.g. 0x10200000)',
  }],

  [['--dont-stop-app-on-reset'], {
    dest: 'dontStopAppOnReset',
    default: false,
    required: false,
    action: StoreDeprecatedDefaultCapabilityTrueAction,
    help: '(Android-only) When included, refrains from stopping the app before restart',
  }],

  [['--calendar-format'], {
    default: null,
    dest: 'calendarFormat',
    required: false,
    action: StoreDeprecatedDefaultCapabilityAction,
    help: '(IOS-only) calendar format for the iOS simulator (e.g. gregorian)',
  }],

  [['--native-instruments-lib'], {
    default: false,
    dest: 'nativeInstrumentsLib',
    action: StoreDeprecatedDefaultCapabilityTrueAction,
    required: false,
    help: '(IOS-only) IOS has a weird built-in unavoidable ' +
          'delay. We patch this in appium. If you do not want it patched, pass in this flag.',
  }],

  [['--keep-keychains'], {
    default: false,
    dest: 'keepKeyChains',
    action: StoreDeprecatedDefaultCapabilityTrueAction,
    required: false,
    help: '(iOS-only) Whether to keep keychains ' +
          '(Library/Keychains) when reset app between sessions',
  }],

  [['--localizable-strings-dir'], {
    required: false,
    dest: 'localizableStringsDir',
    default: 'en.lproj',
    action: StoreDeprecatedDefaultCapabilityAction,
    help: '(IOS-only) the relative path of the dir where Localizable.strings file resides (e.g. en.lproj)',
  }],

  [['--show-ios-log'], {
    default: false,
    dest: 'showIOSLog',
    action: StoreDeprecatedDefaultCapabilityTrueAction,
    required: false,
    help: '(IOS-only) if set, the iOS system log will be written to the console',
  }],

  [['--async-trace'], {
    dest: 'longStacktrace',
    default: false,
    required: false,
    action: StoreDeprecatedDefaultCapabilityTrueAction,
    help: 'Add long stack traces to log entries. Recommended for debugging only.',
  }],

  [['--chromedriver-port'], {
    default: null,
    dest: 'chromedriverPort',
    required: false,
    type: 'int',
    action: StoreDeprecatedDefaultCapabilityAction,
    help: 'Port upon which ChromeDriver will run. If not given, ' +
          'Android driver will pick a random available port.',
  }],

  [['--log-filters'], {
    dest: 'logFilters',
    default: null,
    required: false,
    help: 'Set the full path to a JSON file containing one or more log filtering rules',
  }],
];

function parseSecurityFeatures (features) {
  const splitter = (splitOn, str) => `${str}`.split(splitOn)
    .map((s) => s.trim())
    .filter(Boolean);
  let parsedFeatures;
  try {
    parsedFeatures = splitter(',', features);
  } catch (err) {
    throw new TypeError('Could not parse value of --allow/deny-insecure. Should be ' +
      'a list of strings separated by commas, or a path to a file ' +
      'listing one feature name per line.');
  }

  if (parsedFeatures.length === 1 && fs.existsSync(parsedFeatures[0])) {
    // we might have a file which is a list of features
    try {
      const fileFeatures = fs.readFileSync(parsedFeatures[0], 'utf8');
      parsedFeatures = splitter('\n', fileFeatures);
    } catch (err) {
      throw new TypeError(`Attempted to read --allow/deny-insecure feature names ` +
        `from file ${parsedFeatures[0]} but got error: ${err.message}`);
    }
  }

  return parsedFeatures;
}

function parseDefaultCaps (capsOrPath) {
  let caps = capsOrPath;
  let loadedFromFile = false;
  try {
    // use synchronous file access, as `argparse` provides no way of either
    // awaiting or using callbacks. This step happens in startup, in what is
    // effectively command-line code, so nothing is blocked in terms of
    // sessions, so holding up the event loop does not incur the usual
    // drawbacks.
    if (_.isString(capsOrPath) && fs.statSync(capsOrPath).isFile()) {
      caps = fs.readFileSync(capsOrPath, 'utf8');
      loadedFromFile = true;
    }
  } catch (err) {
    // not a file, or not readable
  }
  try {
    const result = JSON.parse(caps);
    if (!_.isPlainObject(result)) {
      throw new Error(`'${_.truncate(result, {length: 100})}' is not an object`);
    }
    return result;
  } catch (e) {
    const msg = loadedFromFile
      ? `Default capabilities in '${capsOrPath}' must be a valid JSON`
      : `Default capabilities must be a valid JSON`;
    throw new TypeError(`${msg}. Original error: ${e.message}`);
  }
}

function getParser () {
  const parser = new ArgumentParser({
    add_help: true,
    description: 'A webdriver-compatible server for use with native and hybrid iOS and Android applications.',
    prog: process.argv[1] || 'Appium'
  });
  parser.rawArgs = args;
  for (const [flagsOrNames, options] of args) {
    parser.add_argument(...flagsOrNames, options);
  }
  parser.add_argument('-v', '--version', {
    action: 'version',
    version: require(path.resolve(rootDir, 'package.json')).version,
  });
  return parser;
}

function getDefaultArgs () {
  return args.reduce((acc, [, {dest, default: defaultValue}]) => {
    acc[dest] = defaultValue;
    return acc;
  }, {});
}

export default getParser;
export { getDefaultArgs, getParser };
