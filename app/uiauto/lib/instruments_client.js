/*global UIATarget:true */
"use strict";

var system = UIATarget.localTarget().host();
var defWaitForDataTimeout = 3600;
var waitForDataTimeout = defWaitForDataTimeout;
var curAppiumCmdId = -1;

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
  curAppiumCmdId++;
  var args = ['-s', '/tmp/instruments_sock'], res
    , binaryPath = globalPath;
  if (isAppiumApp) {
    globalPath = null;
  }
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
    console.log(e.name + " error getting command " + curAppiumCmdId + ": " + e.message);
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
var nodePath = null;
try {
  nodePath = sysExec('which node');
} catch (e) {
  try {
    nodePath = sysExec("ls /usr/local/bin/node");
  } catch (e) {
    try {
      nodePath = sysExec("ls /opt/local/bin/node");
    } catch (e) {
      throw new Error("Could not find node using `which node`, at /usr/local/" +
                      "bin/node, or at /opt/local/bin/node. Where is it?");
    }
  }
}
