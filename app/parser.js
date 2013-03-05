"use strict";
var ap = require('argparse').ArgumentParser
  , pkgObj = require("../package")
  ;

// Setup all the command line argument parsing
module.exports = function() {
  var parser = new ap({
    version: pkgObj.version,
    addHelp: true,
    description: 'A webdriver-compatible server for use with native and hybrid iOS and Android applications.'
  });

  parser.addArgument( ['--app'] , {
    required: false
    , help: 'IOS: abs path to simulator-compiled .app file or the bundle_id of the desired target on device; Android: abs path to .apk file'
    , nargs: 1
  });

  parser.addArgument(['-V', '--verbose'], {
    required: false
    , help: 'Get verbose logging output'
    , nargs: 0
  });
  parser.addArgument(['-U', '--udid'] , {
    required: false
    , help: '(IOS-only) Unique device identifier of the connected physical device'
    , nargs: 0
  });

  parser.addArgument(['-a', '--address'] , {
    defaultValue: '127.0.0.1'
    , required: false
    , help: 'IP Address to listen on'
    , nargs: 1
  });

  parser.addArgument(['-p', '--port'] , {
    defaultValue: 4723
    , required: false
    , help: 'Port to listen on'
    , nargs: 1
  });

  parser.addArgument(['-r', '--remove'] , {
    defaultValue: true
    , required: false
    , help: '(IOS-only) Remove Instruments trace directories'
    , nargs: 0
  });

  parser.addArgument(['-s', '--reset'] , {
    defaultValue: true
    , required: false
    , help: 'Reset app state after each session (IOS: delete plist; Android: ' +
            'install app before session and uninstall after session)'
    , nargs: 0
  });

  parser.addArgument(['-l', '--launch'] , {
    defaultValue: false
    , required: false
    , help: 'Pre-launch the application before allowing the first session ' +
            '(Requires --app and, for Android, --app-pkg and --app-activity)'
    , nargs: 0
  });

  parser.addArgument(['-g', '--log'] , {
    defaultValue: null
    , required: false
    , help: 'Log output to this file instead of stdout'
    , nargs: 1
  });

  parser.addArgument(['-G', '--webhook'] , {
    defaultValue: null
    , required: false
    , help: 'Also send log output to this HTTP listener'
    , nargs: 1
  });

  parser.addArgument(['-w', '--warp'] , {
    defaultValue: false
    , required: false
    , help: '(IOS-only) IOS has a weird built-in unavoidable sleep. One way ' +
            'around this is to speed up the system clock. Use this time warp ' +
            'hack to speed up test execution (WARNING, actually alters clock, ' +
            'could be bad news bears!)'
    , nargs: 0
  });

  parser.addArgument(['--app-pkg'], {
    dest: 'androidPackage'
    , defaultValue: null
    , required: false
    , help: "(Android-only) Java package of the Android app you want to run " +
            "(e.g., com.example.android.myApp)"
    , nargs: 1
  });

  parser.addArgument(['--app-activity'], {
    dest: 'androidActivity'
    , defaultValue: 'MainActivity'
    , required: false
    , help: "(Android-only) Activity name for the Android activity you want " +
            "to launch from your package (e.g., MainActivity)"
    , nargs: 1
  });

  return parser;
};
