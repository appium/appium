"use strict";

var system = UIATarget.localTarget().host();
// clientPath is relative to where you run the appium server from
var clientPath = 'instruments/client.js';
var defWaitForDataTimeout = 60;
var waitForDataTimeout = defWaitForDataTimeout;

var getBinaryPath = function(cmd) {
  var res = system.performTaskWithPathArgumentsTimeout('/bin/bash', ['-c', 'which ' + cmd], 3);
  if (res.exitCode !== 0) {
    throw new Error("Failed trying to get binary path " + cmd);
  } else {
    var path = res.stdout.trim();
    if (path.length) {
      return path;
    } else {
      throw new Error("Could not find a binary for " + cmd + ", please make sure you have one available!");
    }
  }
};

var sendResultAndGetNext = function(result) {
  var args = ['-s', '/tmp/instruments_sock'], res
    , binaryPath = globalPath;
  if (globalPath === null) {
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
  globalPath = getBinaryPath('instruments_client');
} catch (e) { }
var nodePath = getBinaryPath('node');
