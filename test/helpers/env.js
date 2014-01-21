"use strict";

var path = require('path');

var env = {};

// local config
env.APPIUM_HOST = process.env.APPIUM_HOST || '127.0.0.1';
env.APPIUM_PORT = parseInt(process.env.APPIUM_PORT || 4723, 10);
env.MOCHA_TIMEOUT = parseInt(process.env.MOCHA_TIMEOUT || 180000, 10);

// sauce
env.SAUCE = process.env.SAUCE;
if (env.SAUCE) {
  env.APPIUM_HOST = process.env.APPIUM_HOST || 'ondemand.saucelabs.com';
  env.APPIUM_PORT = parseInt(process.env.APPIUM_PORT || 80, 10);
  if (typeof process.env.SAUCE_USERNAME === "undefined" || typeof process.env.SAUCE_ACCESS_KEY === "undefined") {
    throw new Error("Need to set SAUCE_USERNAME and SAUCE_ACCESS_KEY");
  }
  env.APPIUM_USERNAME = process.env.SAUCE_USERNAME;
  env.APPIUM_PASSWORD = process.env.SAUCE_ACCESS_KEY;
  env.MOCHA_TIMEOUT = parseInt(process.env.MOCHA_TIMEOUT || 500000, 10);
}

env.LAUNCH_TIMEOUT = parseInt(process.env.LAUNCH_TIMEOUT || 15000, 10);
env.VERBOSE = process.env.VERBOSE;
env.ISOLATED_TESTS = process.env.ISOLATED_TESTS;
env.FAST_TESTS = !env.ISOLATED_TESTS;

// real device or emulator
env.REAL_DEVICE = process.env.REAL_DEVICE;
env.EMU = !env.REAL_DEVICE;

// device selection
env.DEVICE = (process.env.DEVICE || 'ios').toLowerCase();

function iphoneOrIpadSimulator(device) {
  return device.match(/ipad/i)? 'iPad Simulator' : 'iPhone Simulator';
}

switch(env.DEVICE) {
  case 'ios':
  case 'ios6':
  case 'ios6_iphone':
  case 'ios6_ipad':
    env.CAPS = {
      browserName: ''
      , device: iphoneOrIpadSimulator(env.DEVICE),
      app:  path.resolve(__dirname, "../../sample-code/apps/" + process.env.APP +
        "/build/Release-iphonesimulator/" + process.env.APP + ".app")
    };
  break;
  case 'ios7':
  case 'ios7_iphone':
  case 'ios7_ipad':
    env.CAPS = {
      browserName: ''
      , device: iphoneOrIpadSimulator(env.DEVICE),
      app:  path.resolve(__dirname, "../../sample-code/apps/" + process.env.APP +
        "/build/Release-iphonesimulator/" + process.env.APP + ".app")
    };
  break;
  case 'android':
    env.CAPS = {
      device: 'Android'
    };
  break;
  case 'selendroid':
    env.CAPS = {
      browserName: 'Selendroid'
      , device: 'Selendroid',
      app: path.resolve(__dirname, "../../sample-code/apps/" + process.env.APP + "/bin/" + process.env.APP + "-debug.apk")
    };
  break;
  case 'firefox':
    env.CAPS = {
      browserName: 'Firefox'
      , device: 'Firefox',
      app: process.env.APP
    };
  break;
  default:
    throw new Error('Unknown device!!!');
}

env.IOS =env.DEVICE.match(/ios/i);
env.IOS7 =env.DEVICE.match(/ios7/i);
env.ANDROID =env.DEVICE.match(/android/i);

// caps overide for sauce
if (env.SAUCE) {
  if (env.DEVICE === 'IOS') {
    env.CAPS.version = "6.1";
    env.CAPS.platform = "Mac 10.8";
  } else if (env.CAPS.device === 'Android') {
    env.CAPS.version = "4.2";
    env.CAPS.platform = "LINUX";
  }
}

// app path root

// rest enf points
env.TEST_END_POINT = 'http://localhost:' + env.APPIUM_PORT + '/test/';
env.GUINEA_TEST_END_POINT = env.TEST_END_POINT + 'guinea-pig';
env.CHROME_TEST_END_POINT = 'http://10.0.2.2:' + env.APPIUM_PORT + '/test/';
env.CHROME_GUINEA_TEST_END_POINT = env.CHROME_TEST_END_POINT + 'guinea-pig';

module.exports = env;
