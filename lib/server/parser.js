"use strict";
var ap = require('argparse').ArgumentParser
  , pkgObj = require('../../package.json')
  , path = require('path')
  , _ = require('underscore');

var args = [
  [['--shell'], {
    required: false
  , defaultValue: null
  , help: 'Enter REPL mode'
  , nargs: 0
  }],

  [['--localizable-strings-dir'], {
    required: false
  , dest: 'localizableStringsDir'
  , defaultValue: 'en.lproj'
  , help: 'IOS only: the relative path of the dir where Localizable.strings file resides '
  , example: "en.lproj"
  }],

  [['--app'], {
    required: false
  , defaultValue: null
  , help: 'IOS: abs path to simulator-compiled .app file or the bundle_id of the desired target on device; Android: abs path to .apk file'
  , example: "/abs/path/to/my.app"
  }],

  [['--ipa'], {
    required: false
  , defaultValue: null
  , help: '(IOS-only) abs path to compiled .ipa file'
  , example: "/abs/path/to/my.ipa"
  }],

  [['-q', '--quiet'], {
    required: false
  , defaultValue: false
  , action: 'storeTrue'
  , help: "Don't use verbose logging output (deprecated, use --log-level instead)"
  , nargs: 0
  }],

  [['-U', '--udid'], {
    required: false
  , defaultValue: null
  , example: "1adsf-sdfas-asdf-123sdf"
  , help: 'Unique device identifier of the connected physical device'
  }],

  [['-a', '--address'], {
    defaultValue: '0.0.0.0'
  , required: false
  , example: "0.0.0.0"
  , help: 'IP Address to listen on'
  }],

  [['-p', '--port'], {
    defaultValue: 4723
  , required: false
  , type: 'int'
  , example: "4723"
  , help: 'port to listen on'
  }],

  [['-ca', '--callback-address'], {
    required: false
  , dest: 'callbackAddress'
  , defaultValue: null
  , example: "127.0.0.1"
  , help: 'callback IP Address (default: same as address)'
  }],

  [['-cp', '--callback-port'], {
    required: false
  , dest: 'callbackPort'
  , defaultValue: null
  , type: 'int'
  , example: "4723"
  , help: 'callback port (default: same as port)'
  }],

  [['-bp', '--bootstrap-port'], {
    defaultValue: 4724
  , dest: 'bootstrapPort'
  , required: false
  , type: 'int'
  , example: "4724"
  , help: '(Android-only) port to use on device to talk to Appium'
  }],

  [['-k', '--keep-artifacts'], {
    defaultValue: false
  , dest: 'keepArtifacts'
  , action: 'storeTrue'
  , required: false
  , help: 'deprecated, no effect, trace is now in tmp dir by default and is ' +
  ' cleared before each run. Please also refer to the --trace-dir flag.'
  , nargs: 0
  }],

  [['-r', '--backend-retries'], {
    defaultValue: 3
  , dest: 'backendRetries'
  , required: false
  , type: 'int'
  , example: "3"
  , help: '(iOS-only) How many times to retry launching Instruments ' +
          'before saying it crashed or timed out'
  }],

  [['--session-override'], {
    defaultValue: false
  , dest: 'sessionOverride'
  , action: 'storeTrue'
  , required: false
  , help: 'Enables session override (clobbering)'
  , nargs: 0
  }],

  [['--full-reset'], {
    defaultValue: false
  , dest: 'fullReset'
  , action: 'storeTrue'
  , required: false
  , help: '(iOS) Delete the entire simulator folder. (Android) Reset app ' +
          'state by uninstalling app instead of clearing app data. On ' +
          'Android, this will also remove the app after the session is complete.'
  , nargs: 0
  }],

  [['--no-reset'], {
    defaultValue: false
  , dest: 'noReset'
  , action: 'storeTrue'
  , required: false
  , help: "Don't reset app state between sessions (IOS: don't delete app " +
          "plist files; Android: don't uninstall app before new session)"
  , nargs: 0
  }],

  [['-l', '--pre-launch'], {
    defaultValue: false
  , dest: 'launch'
  , action: 'storeTrue'
  , required: false
  , help: 'Pre-launch the application before allowing the first session ' +
          '(Requires --app and, for Android, --app-pkg and --app-activity)'
  , nargs: 0
  }],

  [['-lt', '--launch-timeout'], {
    defaultValue: 90000
  , dest: 'launchTimeout'
  , required: false
  , help: '(iOS-only) how long in ms to wait for Instruments to launch'
  }],

  [['-g', '--log'], {
    defaultValue: null
  , required: false
  , example: "/path/to/appium.log"
  , help: 'Also send log output to this file'
  }],

  [['--log-level'], {
    choices: ['debug','info','warn', 'error']
  // TODO: enable this once we got rid of --quiet
  //, defaultValue: 'info'
  , dest: 'logLevel'
  , required: false
  , example: "debug"
  , help: 'log level (default: debug)'
  }],

  [['--log-timestamp'], {
    defaultValue: false
  , required: false
  , help: 'Show timestamps in console output'
  , nargs: 0
  , action: 'storeTrue'
  , dest: 'logTimestamp'
  }],

  [['--local-timezone'], {
    defaultValue: false
  , required: false
  , help: 'Use local timezone for timestamps'
  , nargs: 0
  , action: 'storeTrue'
  , dest: 'localTimezone'
  }],

  [['--log-no-colors'], {
    defaultValue: false
  , required: false
  , help: "Don't use colors in console output"
  , nargs: 0
  , action: 'storeTrue'
  , dest: 'logNoColors'
  }],

  [['-G', '--webhook'], {
    defaultValue: null
  , required: false
  , example: "localhost:9876"
  , help: 'Also send log output to this HTTP listener'
  }],

  [['--native-instruments-lib'], {
    defaultValue: false
  , dest: 'nativeInstrumentsLib'
  , action: 'storeTrue'
  , required: false
  , help: '(IOS-only) IOS has a weird built-in unavoidable ' +
          'delay. We patch this in appium. If you do not want it patched, ' +
          'pass in this flag.'
  , nargs: 0
  }],

  [['--app-pkg'], {
    dest: 'androidPackage'
  , defaultValue: null
  , required: false
  , example: "com.example.android.myApp"
  , help: "(Android-only) Java package of the Android app you want to run " +
          "(e.g., com.example.android.myApp)"
  }],

  [['--app-activity'], {
    dest: 'androidActivity'
  , defaultValue: null
  , required: false
  , example: "MainActivity"
  , help: "(Android-only) Activity name for the Android activity you want " +
          "to launch from your package (e.g., MainActivity)"
  }],

  [['--app-wait-package'], {
    dest: 'androidWaitPackage'
  , defaultValue: false
  , required: false
  , example: "com.example.android.myApp"
  , help: "(Android-only) Package name for the Android activity you want " +
          "to wait for (e.g., com.example.android.myApp)"
  }],

  [['--app-wait-activity'], {
    dest: 'androidWaitActivity'
  , defaultValue: false
  , required: false
  , example: "SplashActivity"
  , help: "(Android-only) Activity name for the Android activity you want " +
          "to wait for (e.g., SplashActivity)"
  }],

  [['--android-coverage'], {
    dest: 'androidCoverage'
  , defaultValue: false
  , required: false
  , example: 'com.my.Pkg/com.my.Pkg.instrumentation.MyInstrumentation'
  , help: "(Android-only) Fully qualified instrumentation class. Passed to -w in " +
      "adb shell am instrument -e coverage true -w "
  }],

  [['--avd'], {
    defaultValue: null
  , required: false
  , example: "@default"
  , help: "(Android-only) Name of the avd to launch"
  }],

  [['--avd-args'], {
    dest: 'avdArgs'
  , defaultValue: null
  , required: false
  , example: "-no-snapshot-load"
  , help: "(Android-only) Additional emulator arguments to launch the avd"
  }],

  [['--device-ready-timeout'], {
    dest: 'androidDeviceReadyTimeout'
  , defaultValue: '5'
  , required: false
  , example: "5"
  , help: "(Android-only) Timeout in seconds while waiting for device to become ready"
  }],

  [['--safari'], {
    defaultValue: false
  , action: 'storeTrue'
  , required: false
  , help: "(IOS-Only) Use the safari app"
  , nargs: 0
  }],

  [['--device-name'], {
    dest: 'deviceName'
  , defaultValue: null
  , required: false
  , example: "iPhone Retina (4-inch), Android Emulator"
  , help: "Name of the mobile device to use"
  }],

  [['--platform-name'], {
    dest: 'platformName'
  , defaultValue: null
  , required: false
  , example: "iOS"
  , help: "Name of the mobile platform: iOS, Android, or FirefoxOS"
  }],

  [['--platform-version'], {
    dest: 'platformVersion'
  , defaultValue: null
  , required: false
  , example: "7.1"
  , help: "Version of the mobile platform"
  }],

  [['--automation-name'], {
    dest: 'automationName'
  , defaultValue: null
  , required: false
  , example: "Appium"
  , help: "Name of the automation tool: Appium or Selendroid"
  }],

  [['--browser-name'], {
    dest: 'browserName'
  , defaultValue: null
  , required: false
  , example: "Safari"
  , help: "Name of the mobile browser: Safari or Chrome"
  }],

  [['--default-device', '-dd'], {
    dest: 'defaultDevice'
  , defaultValue: false
  , action: 'storeTrue'
  , required: false
  , help: "(IOS-Simulator-only) use the default simulator that instruments " +
          "launches on its own"
  }],

  [['--force-iphone'], {
    defaultValue: false
  , dest: 'forceIphone'
  , action: 'storeTrue'
  , required: false
  , help: "(IOS-only) Use the iPhone Simulator no matter what the app wants"
  , nargs: 0
  }],

  [['--force-ipad'], {
    defaultValue: false
  , dest: 'forceIpad'
  , action: 'storeTrue'
  , required: false
  , help: "(IOS-only) Use the iPad Simulator no matter what the app wants"
  , nargs: 0
  }],

  [['--language'], {
    defaultValue: null
  , dest: 'language'
  , required: false
  , example: "en"
  , help: 'Language for the iOS simulator / Android Emulator'
  }],

  [['--locale'], {
    defaultValue: null
  , dest: 'locale'
  , required: false
  , example: "en_US"
  , help: 'Locale for the iOS simulator / Android Emulator'
  }],

  [['--calendar-format'], {
    defaultValue: null
  , dest: 'calendarFormat'
  , required: false
  , example: "gregorian"
  , help: '(IOS-only) calendar format for the iOS simulator'
  }],

  [['--orientation'], {
    defaultValue: null
  , required: false
  , example: "LANDSCAPE"
  , help: "(IOS-only) use LANDSCAPE or PORTRAIT to initialize all requests " +
          "to this orientation"
  }],

  [['--tracetemplate'], {
    defaultValue: null
  , dest: 'automationTraceTemplatePath'
  , required: false
  , example: "/Users/me/Automation.tracetemplate"
  , help: "(IOS-only) .tracetemplate file to use with Instruments"
  }],

  [['--show-sim-log'], {
    defaultValue: false
  , dest: 'showSimulatorLog'
  , action: 'storeTrue'
  , required: false
  , deprecatedFor: '--show-ios-log'
  , help: "(IOS-only) if set, the iOS simulator log will be written to the console"
  , nargs: 0
  }],

  [['--show-ios-log'], {
    defaultValue: false
  , dest: 'showIOSLog'
  , action: 'storeTrue'
  , required: false
  , help: "(IOS-only) if set, the iOS system log will be written to the console"
  , nargs: 0
  }],

  [['--nodeconfig'], {
    required: false
  , defaultValue: null
  , help: 'Configuration JSON file to register appium with selenium grid'
  , example: "/abs/path/to/nodeconfig.json"
  }],

  [['-ra', '--robot-address'], {
    defaultValue: '0.0.0.0'
  , dest: 'robotAddress'
  , required: false
  , example: "0.0.0.0"
  , help: 'IP Address of robot'
  }],

  [['-rp', '--robot-port'], {
    defaultValue: -1
  , dest: 'robotPort'
  , required: false
  , type: 'int'
  , example: "4242"
  , help: 'port for robot'
  }],

  [['--selendroid-port'], {
    defaultValue: 8080
  , dest: 'selendroidPort'
  , required: false
  , type: 'int'
  , example: "8080"
  , help: 'Local port used for communication with Selendroid'
  }],

  [['--chromedriver-port'], {
    defaultValue: 9515
  , dest: 'chromeDriverPort'
  , required: false
  , type: 'int'
  , example: '9515'
  , help: 'Port upon which ChromeDriver will run'
  }],

  [['--chromedriver-executable'], {
    defaultValue: null
  , dest: 'chromedriverExecutable'
  , required: false
  , help: 'ChromeDriver executable full path'
  }],

  [['--use-keystore'], {
    defaultValue: false
  , dest: 'useKeystore'
  , action: 'storeTrue'
  , required: false
  , help: '(Android-only) When set the keystore will be used to sign apks.'
  }],

  [['--keystore-path'], {
    defaultValue: path.resolve(process.env.HOME || process.env.USERPROFILE || '', '.android', 'debug.keystore')
  , dest: 'keystorePath'
  , required: false
  , help: '(Android-only) Path to keystore'
  }],

  [['--keystore-password'], {
    defaultValue: 'android'
  , dest: 'keystorePassword'
  , required: false
  , help: '(Android-only) Password to keystore'
  }],

  [['--key-alias'], {
    defaultValue: 'androiddebugkey'
  , dest: 'keyAlias'
  , required: false
  , help: '(Android-only) Key alias'
  }],

  [['--key-password'], {
    defaultValue: 'android'
  , dest: 'keyPassword'
  , required: false
  , help: '(Android-only) Key password'
  }],

  [['--show-config'], {
    defaultValue: false
  , dest: 'showConfig'
  , action: 'storeTrue'
  , required: false
  , help: 'Show info about the appium server configuration and exit'
  }],

  [['--no-perms-check'], {
    defaultValue: false
  , dest: 'noPermsCheck'
  , action: 'storeTrue'
  , required: false
  , help: "Bypass Appium's checks to ensure we can read/write necessary files"
  }],

  [['--command-timeout'], {
    defaultValue: 60
  , dest: 'defaultCommandTimeout'
  , type: 'int'
  , required: false
  , help: 'The default command timeout for the server to use for all ' +
          'sessions. Will still be overridden by newCommandTimeout cap'
  }],

  [['--keep-keychains'], {
    defaultValue: false
  , dest: 'keepKeyChains'
  , action: 'storeTrue'
  , required: false
  , help: "(iOS) Whether to keep keychains (Library/Keychains) when reset app between sessions"
  , nargs: 0
  }],

  [['--strict-caps'], {
    defaultValue: false
  , dest: 'enforceStrictCaps'
  , action: 'storeTrue'
  , required: false
  , help: "Cause sessions to fail if desired caps are sent in that Appium " +
          "does not recognize as valid for the selected device"
  , nargs: 0
  }],

  [['--tmp'], {
    defaultValue: null
  , dest: 'tmpDir'
  , required: false
  , help: 'Absolute path to directory Appium can use to manage temporary ' +
          'files, like built-in iOS apps it needs to move around. On *nix/Mac ' +
          'defaults to /tmp, on Windows defaults to C:\\Windows\\Temp'
  }],

  [['--trace-dir'], {
    defaultValue: null
  , dest: 'traceDir'
  , required: false
  , help: 'Absolute path to directory Appium use to save ios instruments ' +
          'traces, defaults to <tmp dir>/appium-instruments'
  }],

  [['--intent-action'], {
    dest: 'intentAction'
  , defaultValue: "android.intent.action.MAIN"
  , required: false
  , example: "android.intent.action.MAIN"
  , help: "(Android-only) Intent action which will be used to start activity"
  }],

  [['--intent-category'], {
    dest: 'intentCategory'
  , defaultValue: "android.intent.category.LAUNCHER"
  , required: false
  , example: "android.intent.category.APP_CONTACTS"
  , help: "(Android-only) Intent category which will be used to start activity"
  }],

  [['--intent-flags'], {
    dest: 'intentFlags'
  , defaultValue: "0x10200000"
  , required: false
  , example: "0x10200000"
  , help: "(Android-only) Flags that will be used to start activity"
  }],

  [['--intent-args'], {
    dest: 'optionalIntentArguments'
  , defaultValue: null
  , required: false
  , example: "0x10200000"
  , help: "(Android-only) Additional intent arguments that will be used to " +
          "start activity"
  }]
];

// Setup all the command line argument parsing
module.exports = function () {
  var parser = new ap({
    version: pkgObj.version,
    addHelp: true,
    description: 'A webdriver-compatible server for use with native and hybrid iOS and Android applications.'
  });

  _.each(args, function (arg) {
    parser.addArgument(arg[0], arg[1]);
  });

  parser.rawArgs = args;

  return parser;
};
