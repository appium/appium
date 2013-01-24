"use strict";

var system = UIATarget.localTarget().host();
// clientPath is relative to where you run the appium server from
var clientPath = 'instruments/client.js';
var waitForDataTimeout = 60;

var sendResultAndGetNext = function(result) {
  var args = [clientPath, '-s', '/tmp/instruments_sock'], res;
  if (typeof result !== "undefined") {
    args = args.concat(['-r', JSON.stringify(result)]);
  }
  try {
    res = system.performTaskWithPathArgumentsTimeout('/usr/local/bin/node', args, waitForDataTimeout);
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
