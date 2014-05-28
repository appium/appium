"use strict";

var env = require('./env'),
    Q = require('q'),
    exec = Q.denodeify(require('child_process').exec);

exports.androidReset = function (appPackage, appActivity) {
  var cmd = 'adb shell am start -n ' + appPackage + '/' + appActivity;
  return exec(cmd);
};

exports.androidUninstall = function (appPackage) {
  var cmd = 'adb uninstall ' + appPackage;
  return exec(cmd, {timeout: env.LAUNCH_TIMEOUT / 2})
    .catch(function () {})
    .then(function () { return Q.delay(500); });
};

exports.iosReset = function () {
  if (env.VERBOSE) console.log('Resetting ios simulator.');
  return exec('pkill -9 -f iPhoneSimulator')
    .catch(function () {})
    .then(function () { return exec('pkill -9 -f instruments'); })
    .catch(function () {})
    .then(function () { return exec('rm -rf $HOME/Library/Application\\ Support/iPhone\\ Simulator'); })
    .catch(function () {});
};
