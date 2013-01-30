"use strict";

var system = UIATarget.localTarget().host();
// clientPath is relative to where you run the appium server from
var clientPath = 'instruments/client.js';
var defWaitForDataTimeout = 60;
var waitForDataTimeout = defWaitForDataTimeout;

var getNodeBinaryPath = function() {
  var res = system.performTaskWithPathArgumentsTimeout('/bin/bash', ['-c', 'which node'], 3);
  if (res.exitCode !== 0) {
    throw new Error("Failed trying to get node.js binary path");
  } else {
    var path = res.stdout.trim();
    if (path.length) {
      return path;
    } else {
      throw new Error("Could not find a node.js binary, please make sure you have one available!");
    }
  }
};

var sendResultAndGetNext = function(result) {
  var args = [clientPath, '-s', '/tmp/instruments_sock'], res;
  if (typeof result !== "undefined") {
    args = args.concat(['-r', JSON.stringify(result)]);
  }
  try {
    res = system.performTaskWithPathArgumentsTimeout(nodePath, args, waitForDataTimeout);
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

var nodePath = getNodeBinaryPath();
