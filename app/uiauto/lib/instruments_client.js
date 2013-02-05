"use strict";

var system = UIATarget.localTarget().host();
var defWaitForDataTimeout = 60;
var waitForDataTimeout = defWaitForDataTimeout;

var sysExec = function(cmd) {
  var res = system.performTaskWithPathArgumentsTimeout('/bin/bash', ['-c', cmd], 3);
  if (res.exitCode !== 0) {
    throw new Error("Failed executing the command " + cmd + " (exit code " + res.exitCode + ")");
  } else {
    var path = res.stdout.trim();
    if (path.length) {
      return path;
    } else {
      throw new Error("Executing " + cmd + " failed!");
    }
  }
};

// clientPath is relative to where you run the appium server from
var clientPath = (function() {
  var client = 'instruments/client.js';
  var module = 'node_modules/appium/';
  
  try {
    sysExec('ls ' + client);
    return client;
  } catch(e) {
    try {
      sysExec('ls ' + module + client);
      return module + client;
    } catch(e) {
      throw new Error("Unable to locate instruments client.");
    }
  }
})();
var isAppiumApp = (function() {
  try {
    return sysExec('echo $Appium_app') !== null;
  } catch(e) {
    return false;
  }
})();

var sendResultAndGetNext = function(result) {
  var args = ['-s', '/tmp/instruments_sock'], res
    , binaryPath = globalPath;
  if (globalPath === null || !isAppiumApp) {
    binaryPath = nodePath;
    args.unshift(clientPath);
  }
  if (typeof result !== "undefined") {
    args = args.concat(['-r', JSON.stringify(result)]);
  }
  try {
    res = system.performTaskWithPathArgumentsTimeout(binaryPath, args, waitForDataTimeout);
  } catch(e) {
    console.log("Socket timed out waiting for a new command, why wasn't there one?");
    return null;
  }

  if (res.exitCode !== 0) {
    console.log("Error talking with instruments client, here's stderr:");
    console.log(res.stderr);
  }
  return res.stdout;
};

var getFirstCommand = function() {
  return sendResultAndGetNext();
};

var globalPath = null;
try {
  globalPath = sysExec('which instruments_client');
} catch (e) { }
var nodePath = sysExec('which node');
