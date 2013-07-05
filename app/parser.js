"use strict";
var ap = require('argparse').ArgumentParser
  , pkgObj = require('../package')
  , path = require('path')
  , _ = require('underscore');

var args = [
  [['--app'] , {
    required: false
    , defaultValue: null
    , help: 'IOS: abs path to simulator-compiled .app file or the bundle_id of the desired target on device; Android: abs path to .apk file'
    , example: "/abs/path/to/my.app"
  }],

  [['--ipa'] , {
    required: false
    , defaultValue: null
    , help: '(IOS-only) abs path to compiled .ipa file'
    , example: "/abs/path/to/my.ipa"
  }],

  [['-q', '--quiet'], {
    required: false
    , defaultValue: false
    , action: 'storeTrue'
    , help: "Don't use verbose logging output"
    , nargs: 0
  }],

  [['-U', '--udid'] , {
    required: false
    , defaultValue: null
    , example: "1adsf-sdfas-asdf-123sdf"
    , help: 'Unique device identifier of the connected physical device'
  }],

  [['-a', '--address'] , {
    defaultValue: '0.0.0.0'
    , required: false
    , example: "0.0.0.0"
    , help: 'IP Address to listen on'
  }],

  [['-p', '--port'] , {
    defaultValue: 4723
    , required: false
    , type: 'int'
    , example: "4723"
    , help: 'port to listen on'
  }],

  [['-k', '--keep-artifacts'] , {
    defaultValue: false
    , dest: 'keepArtifacts'
    , action: 'storeTrue'
    , required: false
    , help: '(IOS-only) Keep Instruments trace directories'
    , nargs: 0
  }],

  [['--no-session-override'] , {
    defaultValue: false
    , dest: 'noSessionOverride'
    , action: 'storeTrue'
    , required: false
    , help: 'Disables session override'
    , nargs: 0
  }],

  [['--full-reset'] , {
    defaultValue: false
    , dest: 'fullReset'
    , action: 'storeTrue'
    , required: false
    , help: '(Android-only) Reset app state by uninstalling app instead of ' +
            'using clean.apk'
    , nargs: 0
  }],

  [['--no-reset'] , {
    defaultValue: false
    , dest: 'noReset'
    , action: 'storeTrue'
    , required: false
    , help: "Don't reset app state between sessions (IOS: don't delete app " +
            "plist files; Android: don't uninstall app before new session)"
    , nargs: 0
  }],

  [['-l', '--pre-launch'] , {
    defaultValue: false
    , dest: 'launch'
    , action: 'storeTrue'
    , required: false
    , help: 'Pre-launch the application before allowing the first session ' +
            '(Requires --app and, for Android, --app-pkg and --app-activity)'
    , nargs: 0
  }],

  [['-g', '--log'] , {
    defaultValue: null
    , required: false
    , example: "/path/to/appium.log"
    , help: 'Log output to this file instead of stdout'
  }],

  [['-G', '--webhook'] , {
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

  [['--app-wait-activity'], {
    dest: 'androidWaitActivity'
    , defaultValue: false
    , required: false
    , example: "SplashActivity"
    , help: "(Android-only) Activity name for the Android activity you want " +
            "to wait for (e.g., SplashActivity)"
  }],

  [['--avd'] , {
    defaultValue: null
    , required: false
    , example: "@default"
    , help: 'name of the avd to launch'
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

  [['--orientation'], {
    defaultValue: null
    , required: false
    , example: "LANDSCAPE"
    , help: "(IOS-only) use LANDSCAPE or PORTRAIT to initialize all requests " +
            "to this orientation"
  }],

  [['--nodeconfig'] , {
    required: false
    , defaultValue: null
    , help: 'Configuration JSON file to register appium with selenium grid'
    , example: "/abs/path/to/nodeconfig.json"
  }],

  [['-ra', '--robot-address'] , {
    defaultValue: '0.0.0.0'
    , dest: 'robotAddress'
    , required: false
    , example: "0.0.0.0"
    , help: 'IP Address of robot'
  }],

  [['-rp', '--robot-port'] , {
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
];

// Setup all the command line argument parsing
module.exports = function() {
  var parser = new ap({
    version: pkgObj.version,
    addHelp: true,
    description: 'A webdriver-compatible server for use with native and hybrid iOS and Android applications.'
  });

  _.each(args, function(arg) {
    parser.addArgument(arg[0], arg[1]);
  });

  parser.rawArgs = args;

  return parser;
};
