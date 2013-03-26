"use strict";
var ap = require('argparse').ArgumentParser
  , pkgObj = require("../package")
  , _ = require("underscore");

var args = [
  [['--app'] , {
    required: false
    , defaultValue: null
    , help: 'IOS: abs path to simulator-compiled .app file or the bundle_id of the desired target on device; Android: abs path to .apk file'
    , example: "/abs/path/to/my.app"
  }],

  [['-V', '--verbose'], {
    required: false
    , defaultValue: false
    , action: 'storeTrue'
    , help: 'Get verbose logging output'
    , nargs: 0
  }],

  [['-U', '--udid'] , {
    required: false
    , defaultValue: null
    , example: "1adsf-sdfas-asdf-123sdf"
    , help: '(IOS-only) Unique device identifier of the connected physical device'
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

  [['--fast-reset'] , {
    defaultValue: false
    , dest: 'fastReset'
    , action: 'storeTrue'
    , required: false
    , help: '(Android-only) Reset app state using clean.apk'
    , nargs: 0
  }],

  [['--no-reset'] , {
    defaultValue: false
    , dest: 'noReset'
    , action: 'storeTrue'
    , required: false
    , help: 'Reset app state after each session (IOS: delete plist; Android: ' +
            'install app before session and uninstall after session)'
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

  [['-w', '--warp'] , {
    defaultValue: false
    , action: 'storeTrue'
    , required: false
    , help: '(IOS-only) IOS has a weird built-in unavoidable sleep. One way ' +
            'around this is to speed up the system clock. Use this time warp ' +
            'hack to speed up test execution (WARNING, actually alters clock, ' +
            'could be bad news bears!)'
    , nargs: 0
  }],

  [['--without-delay'] , {
    defaultValue: false
    , dest: 'withoutDelay'
    , action: 'storeTrue'
    , required: false
    , help: '(IOS-only) IOS has a weird built-in unavoidable delay. One way ' +
            'around this is to run instruments with a library loaded to ' +
            'patch it so that it skips the delay. Use this flag to speed up ' +
            ' test execution.'
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
    , defaultValue: 'MainActivity'
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
  }]
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
