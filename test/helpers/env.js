"use strict";

var path = require('path');

var env = {};

env.IMPLICIT_WAIT_TIMEOUT = 5000;

// local config
env.APPIUM_HOST = process.env.APPIUM_HOST || '127.0.0.1';
env.APPIUM_PORT = parseInt(process.env.APPIUM_PORT || 4723, 10);
env.VERSION = process.env.VERSION;

// travis
env.TRAVIS_JOB_NUMBER = process.env.TRAVIS_JOB_NUMBER;
env.TRAVIS_BUILD_DIR = process.env.TRAVIS_BUILD_DIR;

// http
env.HTTP_CONFIG = {};
if (process.env.HTTP_TIMEOUT)
  { env.HTTP_CONFIG.timeout = parseInt(process.env.HTTP_TIMEOUT, 10); }
if (process.env.HTTP_RETRIES)
  { env.HTTP_CONFIG.retries = parseInt(process.env.HTTP_RETRIES, 10); }
if (process.env.HTTP_RETRY_DELAY)
  { env.HTTP_CONFIG.retryDelay = parseInt(process.env.HTTP_RETRY_DELAY, 10); }

env.DEBUG_CONNECTION = process.env.DEBUG_CONNECTION;

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
  env.SAUCE_REST_ROOT = process.env.SAUCE_REST_ROOT;
}

env.VERBOSE = process.env.VERBOSE;
if (env.VERBOSE) console.log("process.env.LAUNCH_TIMEOUT -->", process.env.LAUNCH_TIMEOUT);
env.LAUNCH_TIMEOUT = JSON.parse(process.env.LAUNCH_TIMEOUT || 60000);
env.ISOLATED_TESTS = process.env.ISOLATED_TESTS;
env.FAST_TESTS = !env.ISOLATED_TESTS;
env.RESET_IOS = process.env.RESET_IOS || true;
env.MOCHA_INIT_TIMEOUT = parseInt(process.env.MOCHA_INIT_TIMEOUT || 300000, 10);

// real device or emulator
env.REAL_DEVICE = process.env.REAL_DEVICE;
env.EMU = !env.REAL_DEVICE;

// device selection
env.DEVICE = (process.env.DEVICE || 'ios').toLowerCase();

function iphoneOrIpadSimulator(device, version) {
  var isIpad = device.match(/ipad/i);
  switch (version) {
    case '6.1':
    case '7.0':
    case '7.1':
      return isIpad ? 'iPad Simulator' : 'iPhone Simulator';
    // case '7.1':
    //   return isIpad ? 'iPad Retina' : 'iPhone Retina 4-inch';
    default:
      throw new Error("invalid version");
  }
}

switch (env.DEVICE) {
  case 'ios':
  case 'ios6':
  case 'ios6_iphone':
  case 'ios6_ipad':
    env.CAPS = {
      browserName: ''
    , deviceName: iphoneOrIpadSimulator(env.DEVICE, "6.1"),
      app: process.env.APP ? path.resolve(__dirname, "../../sample-code/apps/" + process.env.APP + "/build/Release-iphonesimulator/" + process.env.APP + ".app") : ''
    };
    break;
  case 'ios7':
  case 'ios7_iphone':
  case 'ios7_ipad':
    env.CAPS = {
      browserName: ''
    , deviceName: iphoneOrIpadSimulator(env.DEVICE, "7.0")
    , app: process.env.APP ? path.resolve(__dirname, "../../sample-code/apps/" + process.env.APP + "/build/Release-iphonesimulator/" + process.env.APP + ".app") : ''
    };
    break;
  case 'ios71':
  case 'ios71_iphone':
  case 'ios71_ipad':
    env.CAPS = {
      browserName: ''
    , deviceName: iphoneOrIpadSimulator(env.DEVICE, "7.1")
    , app: process.env.APP ? path.resolve(__dirname, "../../sample-code/apps/" + process.env.APP + "/build/Release-iphonesimulator/" + process.env.APP + ".app") : ''
    };
    break;
  case 'android':
    env.CAPS = {
      browserName: ''
    , platformName: 'Android'
    , deviceName: 'Android Emulator'
    };
    if (env.SAUCE) env.CAPS.platformVersion = '4.3';
    break;
  case 'selendroid':
    env.CAPS = {
      browserName: ''
    , platformName: 'Android'
    , automationName: 'Selendroid'
    , deviceName: 'Android Emulator'
    , app: process.env.APP ? path.resolve(__dirname, "../../sample-code/apps/" + process.env.APP + "/bin/" + process.env.APP + "-debug.apk") : ''
    };
    if (env.SAUCE) env.CAPS.platformVersion = '4.1';
    break;
  case 'firefox':
    env.CAPS = {
      browserName: 'Firefox'
    , device: 'Firefox',
      app: process.env.APP ? process.env.APP : ''
    };
    break;
  default:
    throw new Error('Unknown device!!!');
}

env.IOS = env.DEVICE.match(/ios/i);
env.IOS6 = env.DEVICE.match(/ios6/i);
env.IOS7 = env.DEVICE.match(/ios7/i);
env.IOS71 = env.DEVICE.match(/ios71/i);
env.ANDROID = env.DEVICE.match(/android/i);
env.SELENDROID = env.DEVICE.match(/selendroid/i);

// better timeout settings for 71
env.LAUNCH_TIMEOUT =  process.env.LAUNCH_TIMEOUT ? JSON.parse(process.env.LAUNCH_TIMEOUT) :
  (env.IOS71 ? {"global": 60000, "afterSimLaunch": 10000} : 60000);

env.CAPS.launchTimeout = env.LAUNCH_TIMEOUT;

if (env.IOS) {
  env.CAPS.platformName = "iOS";
}

if (env.VERSION) {
  env.CAPS.platformVersion = env.VERSION;
} else if (env.IOS6) {
  env.CAPS.platformVersion = "6.1";
} else if (env.IOS71) {
  env.CAPS.platformVersion = "7.1";
} else if (env.IOS7) {
  env.CAPS.platformVersion = "7.0";
}

// max retry
if (process.env.MAX_RETRY) env.MAX_RETRY = parseInt(process.env.MAX_RETRY, 10);

//dev tarball
env.TARBALL = process.env.TARBALL;

// add the tarball to caps
if (env.SAUCE && env.TARBALL) {
  env.CAPS['appium-version'] = {
    'appium-url': env.TARBALL,
    //'npm-install': true,
    'download-app': false,
    'appium-startup-args': 'minimal'
    //'appium-startup-args': '-m'
  };
  env.CAPS.tags=[env.DEVICE];
}

// rest enf points
env.LOCAL_APPIUM_PORT = env.SAUCE? 4443 : env.APPIUM_PORT;
env.TEST_END_POINT = 'http://localhost:' + env.LOCAL_APPIUM_PORT + '/test/';
env.GUINEA_TEST_END_POINT = env.TEST_END_POINT + 'guinea-pig';
env.CHROME_TEST_END_POINT = 'http://10.0.2.2:' + env.LOCAL_APPIUM_PORT + '/test/';
env.CHROME_GUINEA_TEST_END_POINT = env.CHROME_TEST_END_POINT + 'guinea-pig';

module.exports = env;
