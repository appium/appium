import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import { ArgumentParser } from 'argparse';
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

  [['--ipa'], {
    required: false,
    defaultValue: null,
    help: '(IOS-only) abs path to compiled .ipa file',
    example: '/abs/path/to/my.ipa',
    dest: 'ipa',
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

  [['-bp', '--bootstrap-port'], {
    defaultValue: 4724,
    dest: 'bootstrapPort',
    required: false,
    type: 'int',
    example: '4724',
    help: '(Android-only) port to use on device to talk to Appium',
  }],

  [['-r', '--backend-retries'], {
    defaultValue: 3,
    dest: 'backendRetries',
    required: false,
    type: 'int',
    example: '3',
    help: '(iOS-only) How many times to retry launching Instruments ' +
          'before saying it crashed or timed out',
  }],

  [['--session-override'], {
    defaultValue: false,
    dest: 'sessionOverride',
    action: 'storeTrue',
    required: false,
    help: 'Enables session override (clobbering)',
    nargs: 0,
  }],

  [['-l', '--pre-launch'], {
    defaultValue: false,
    dest: 'launch',
    action: 'storeTrue',
    required: false,
    help: 'Pre-launch the application before allowing the first session ' +
          '(Requires --app and, for Android, --app-pkg and --app-activity)',
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

  [['--safari'], {
    defaultValue: false,
    action: 'storeTrue',
    dest: 'safari',
    required: false,
    help: '(IOS-Only) Use the safari app',
    nargs: 0,
  }],

  [['--default-device', '-dd'], {
    dest: 'defaultDevice',
    defaultValue: false,
    action: 'storeTrue',
    required: false,
    help: '(IOS-Simulator-only) use the default simulator that instruments ' +
          'launches on its own',
  }],

  [['--force-iphone'], {
    defaultValue: false,
    dest: 'forceIphone',
    action: 'storeTrue',
    required: false,
    help: '(IOS-only) Use the iPhone Simulator no matter what the app wants',
    nargs: 0,
  }],

  [['--force-ipad'], {
    defaultValue: false,
    dest: 'forceIpad',
    action: 'storeTrue',
    required: false,
    help: '(IOS-only) Use the iPad Simulator no matter what the app wants',
    nargs: 0,
  }],

  [['--tracetemplate'], {
    defaultValue: null,
    dest: 'automationTraceTemplatePath',
    required: false,
    example: '/Users/me/Automation.tracetemplate',
    help: '(IOS-only) .tracetemplate file to use with Instruments',
  }],

  [['--instruments'], {
    defaultValue: null,
    dest: 'instrumentsPath',
    require: false,
    example: '/path/to/instruments',
    help: '(IOS-only) path to instruments binary',
  }],

  [['--nodeconfig'], {
    required: false,
    defaultValue: null,
    dest: 'nodeconfig',
    help: 'Configuration JSON file to register appium with selenium grid',
    example: '/abs/path/to/nodeconfig.json',
  }],

  [['-ra', '--robot-address'], {
    defaultValue: '0.0.0.0',
    dest: 'robotAddress',
    required: false,
    example: '0.0.0.0',
    help: 'IP Address of robot',
  }],

  [['-rp', '--robot-port'], {
    defaultValue: -1,
    dest: 'robotPort',
    required: false,
    type: 'int',
    example: '4242',
    help: 'port for robot',
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

  [['--isolate-sim-device'], {
    defaultValue: false,
    dest: 'isolateSimDevice',
    action: 'storeTrue',
    required: false,
    help: 'Xcode 6 has a bug on some platforms where a certain simulator ' +
          'can only be launched without error if all other simulator devices ' +
          'are first deleted. This option causes Appium to delete all ' +
          'devices other than the one being used by Appium. Note that this ' +
          'is a permanent deletion, and you are responsible for using simctl ' +
          'or xcode to manage the categories of devices used with Appium.',
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

const deprecatedArgs = [
  [['--command-timeout'], {
    defaultValue: 60,
    dest: 'defaultCommandTimeout',
    type: 'int',
    required: false,
    help: '[DEPRECATED] No effect. This used to be the default command ' +
          'timeout for the server to use for all sessions (in seconds and ' +
          'should be less than 2147483). Use newCommandTimeout cap instead'
  }],

  [['-k', '--keep-artifacts'], {
    defaultValue: false,
    dest: 'keepArtifacts',
    action: 'storeTrue',
    required: false,
    help: '[DEPRECATED] - no effect, trace is now in tmp dir by default and is ' +
          'cleared before each run. Please also refer to the --trace-dir flag.',
    nargs: 0,
  }],

  [['--platform-name'], {
    dest: 'platformName',
    defaultValue: null,
    required: false,
    deprecatedFor: '--default-capabilities',
    example: 'iOS',
    help: '[DEPRECATED] - Name of the mobile platform: iOS, Android, or FirefoxOS',
  }],

  [['--platform-version'], {
    dest: 'platformVersion',
    defaultValue: null,
    required: false,
    deprecatedFor: '--default-capabilities',
    example: '7.1',
    help: '[DEPRECATED] - Version of the mobile platform',
  }],

  [['--automation-name'], {
    dest: 'automationName',
    defaultValue: null,
    required: false,
    deprecatedFor: '--default-capabilities',
    example: 'Appium',
    help: '[DEPRECATED] - Name of the automation tool: Appium, XCUITest, etc.',
  }],

  [['--device-name'], {
    dest: 'deviceName',
    defaultValue: null,
    required: false,
    deprecatedFor: '--default-capabilities',
    example: 'iPhone Retina (4-inch), Android Emulator',
    help: '[DEPRECATED] - Name of the mobile device to use',
  }],

  [['--browser-name'], {
    dest: 'browserName',
    defaultValue: null,
    required: false,
    deprecatedFor: '--default-capabilities',
    example: 'Safari',
    help: '[DEPRECATED] - Name of the mobile browser: Safari or Chrome',
  }],

  [['--app'], {
    dest: 'app',
    required: false,
    defaultValue: null,
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - IOS: abs path to simulator-compiled .app file or the bundle_id of the desired target on device; Android: abs path to .apk file',
    example: '/abs/path/to/my.app',
  }],

  [['-lt', '--launch-timeout'], {
    defaultValue: 90000,
    dest: 'launchTimeout',
    type: 'int',
    required: false,
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (iOS-only) how long in ms to wait for Instruments to launch',
  }],

  [['--language'], {
    defaultValue: null,
    dest: 'language',
    required: false,
    example: 'en',
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - Language for the iOS simulator / Android Emulator',
  }],

  [['--locale'], {
    defaultValue: null,
    dest: 'locale',
    required: false,
    example: 'en_US',
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - Locale for the iOS simulator / Android Emulator',
  }],

  [['-U', '--udid'], {
    dest: 'udid',
    required: false,
    defaultValue: null,
    example: '1adsf-sdfas-asdf-123sdf',
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - Unique device identifier of the connected physical device',
  }],

  [['--orientation'], {
    dest: 'orientation',
    defaultValue: null,
    required: false,
    example: 'LANDSCAPE',
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (IOS-only) use LANDSCAPE or PORTRAIT to initialize all requests ' +
          'to this orientation',
  }],

  [['--no-reset'], {
    defaultValue: false,
    dest: 'noReset',
    action: 'storeTrue',
    required: false,
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - Do not reset app state between sessions (IOS: do not delete app ' +
          'plist files; Android: do not uninstall app before new session)',
    nargs: 0,
  }],

  [['--full-reset'], {
    defaultValue: false,
    dest: 'fullReset',
    action: 'storeTrue',
    required: false,
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (iOS) Delete the entire simulator folder. (Android) Reset app ' +
          'state by uninstalling app instead of clearing app data. On ' +
          'Android, this will also remove the app after the session is complete.',
    nargs: 0,
  }],

  [['--app-pkg'], {
    dest: 'appPackage',
    defaultValue: null,
    required: false,
    deprecatedFor: '--default-capabilities',
    example: 'com.example.android.myApp',
    help: '[DEPRECATED] - (Android-only) Java package of the Android app you want to run ' +
          '(e.g., com.example.android.myApp)',
  }],

  [['--app-activity'], {
    dest: 'appActivity',
    defaultValue: null,
    required: false,
    example: 'MainActivity',
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (Android-only) Activity name for the Android activity you want ' +
          'to launch from your package (e.g., MainActivity)',
  }],

  [['--app-wait-package'], {
    dest: 'appWaitPackage',
    defaultValue: false,
    required: false,
    example: 'com.example.android.myApp',
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (Android-only) Package name for the Android activity you want ' +
          'to wait for (e.g., com.example.android.myApp)',
  }],

  [['--app-wait-activity'], {
    dest: 'appWaitActivity',
    defaultValue: false,
    required: false,
    example: 'SplashActivity',
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (Android-only) Activity name for the Android activity you want ' +
          'to wait for (e.g., SplashActivity)',
  }],

  [['--device-ready-timeout'], {
    dest: 'deviceReadyTimeout',
    defaultValue: 5,
    required: false,
    type: 'int',
    example: '5',
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (Android-only) Timeout in seconds while waiting for device to become ready',
  }],

  [['--android-coverage'], {
    dest: 'androidCoverage',
    defaultValue: false,
    required: false,
    example: 'com.my.Pkg/com.my.Pkg.instrumentation.MyInstrumentation',
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (Android-only) Fully qualified instrumentation class. Passed to -w in ' +
          'adb shell am instrument -e coverage true -w ',
  }],

  [['--avd'], {
    dest: 'avd',
    defaultValue: null,
    required: false,
    example: '@default',
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (Android-only) Name of the avd to launch',
  }],

  [['--avd-args'], {
    dest: 'avdArgs',
    defaultValue: null,
    required: false,
    example: '-no-snapshot-load',
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (Android-only) Additional emulator arguments to launch the avd',
  }],

  [['--use-keystore'], {
    defaultValue: false,
    dest: 'useKeystore',
    action: 'storeTrue',
    required: false,
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (Android-only) When set the keystore will be used to sign apks.',
  }],

  [['--keystore-path'], {
    defaultValue: path.resolve(process.env.HOME || process.env.USERPROFILE || '', '.android', 'debug.keystore'),
    dest: 'keystorePath',
    required: false,
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (Android-only) Path to keystore',
  }],

  [['--keystore-password'], {
    defaultValue: 'android',
    dest: 'keystorePassword',
    required: false,
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (Android-only) Password to keystore',
  }],

  [['--key-alias'], {
    defaultValue: 'androiddebugkey',
    dest: 'keyAlias',
    required: false,
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (Android-only) Key alias',
  }],

  [['--key-password'], {
    defaultValue: 'android',
    dest: 'keyPassword',
    required: false,
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (Android-only) Key password',
  }],

  [['--intent-action'], {
    dest: 'intentAction',
    defaultValue: 'android.intent.action.MAIN',
    required: false,
    example: 'android.intent.action.MAIN',
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (Android-only) Intent action which will be used to start activity',
  }],

  [['--intent-category'], {
    dest: 'intentCategory',
    defaultValue: 'android.intent.category.LAUNCHER',
    required: false,
    example: 'android.intent.category.APP_CONTACTS',
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (Android-only) Intent category which will be used to start activity',
  }],

  [['--intent-flags'], {
    dest: 'intentFlags',
    defaultValue: '0x10200000',
    required: false,
    example: '0x10200000',
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (Android-only) Flags that will be used to start activity',
  }],

  [['--intent-args'], {
    dest: 'optionalIntentArguments',
    defaultValue: null,
    required: false,
    example: '0x10200000',
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (Android-only) Additional intent arguments that will be used to ' +
          'start activity',
  }],

  [['--dont-stop-app-on-reset'], {
    dest: 'dontStopAppOnReset',
    defaultValue: false,
    action: 'storeTrue',
    required: false,
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (Android-only) When included, refrains from stopping the app before restart',
  }],

  [['--calendar-format'], {
    defaultValue: null,
    dest: 'calendarFormat',
    required: false,
    example: 'gregorian',
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (IOS-only) calendar format for the iOS simulator',
  }],

  [['--native-instruments-lib'], {
    defaultValue: false,
    dest: 'nativeInstrumentsLib',
    action: 'storeTrue',
    required: false,
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (IOS-only) IOS has a weird built-in unavoidable ' +
          'delay. We patch this in appium. If you do not want it patched, ' +
          'pass in this flag.',
    nargs: 0,
  }],

  [['--keep-keychains'], {
    defaultValue: false,
    dest: 'keepKeyChains',
    action: 'storeTrue',
    required: false,
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (iOS-only) Whether to keep keychains (Library/Keychains) when reset app between sessions',
    nargs: 0,
  }],

  [['--localizable-strings-dir'], {
    required: false,
    dest: 'localizableStringsDir',
    defaultValue: 'en.lproj',
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (IOS-only) the relative path of the dir where Localizable.strings file resides ',
    example: 'en.lproj',
  }],

  [['--show-ios-log'], {
    defaultValue: false,
    dest: 'showIOSLog',
    action: 'storeTrue',
    required: false,
    deprecatedFor: '--default-capabilities',
    help: '[DEPRECATED] - (IOS-only) if set, the iOS system log will be written to the console',
    nargs: 0,
  }],

  [['--async-trace'], {
    dest: 'longStacktrace',
    defaultValue: false,
    required: false,
    action: 'storeTrue',
    deprecatedFor: '--long-stacktrace',
    help: '[DEPRECATED] - Add long stack traces to log entries. Recommended for debugging only.',
  }],
];

function updateParseArgsForDefaultCapabilities (parser) {
  // here we want to update the parser.parseArgs() function
  // in order to bring together all the args that are actually
  // default caps.
  // once those deprecated args are actually removed, this
  // can also be removed
  parser._parseArgs = parser.parseArgs;
  parser.parseArgs = function parseArgs (args) {
    let parsedArgs = parser._parseArgs(args);
    parsedArgs.defaultCapabilities = parsedArgs.defaultCapabilities || {};
    for (let argEntry of deprecatedArgs) {
      let arg = argEntry[1].dest;
      if (argEntry[1].deprecatedFor === '--default-capabilities') {
        if (arg in parsedArgs && parsedArgs[arg] !== argEntry[1].defaultValue) {
          parsedArgs.defaultCapabilities[arg] = parsedArgs[arg];
          // j s h i n t can't handle complex interpolated strings
          let capDict = {[arg]: parsedArgs[arg]};
          argEntry[1].deprecatedFor = `--default-capabilities ` +
                                      `'${JSON.stringify(capDict)}'`;
        }
      }
    }
    return parsedArgs;
  };
}

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

function getParser () {
  let parser = new ArgumentParser({
    version: require(path.resolve(rootDir, 'package.json')).version,
    addHelp: true,
    description: 'A webdriver-compatible server for use with native and hybrid iOS and Android applications.',
    prog: process.argv[1] || 'Appium'
  });
  let allArgs = _.union(args, deprecatedArgs);
  parser.rawArgs = allArgs;
  for (let arg of allArgs) {
    parser.addArgument(arg[0], arg[1]);
  }
  updateParseArgsForDefaultCapabilities(parser);

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
