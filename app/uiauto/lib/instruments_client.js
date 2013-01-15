"use strict";

var system = UIATarget.localTarget().host();
// clientPath is relative to where you run the appium server from
var clientPath = 'instruments/client.js';

var sendResultAndGetNext = function(result) {
  var args = [clientPath, '-s', '/tmp/instruments_sock'];
  if (typeof result !== "undefined") {
    args = args.concat(['-r', JSON.stringify(result)]);
  }
  var res = system.performTaskWithPathArgumentsTimeout('/usr/local/bin/node', args, 20);
  if (res.exitCode !== 0) {
    console.log("Error talking with instruments client, here's stderr:");
    console.log(res.stderr);
  }
  return res.stdout;
};

var getFirstCommand = function() {
  return sendResultAndGetNext();
};
