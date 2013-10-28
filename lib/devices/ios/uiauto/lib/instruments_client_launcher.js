/*global UIATarget:true */
"use strict";

var system = UIATarget.localTarget().host();
var waitForDataTimeout = 3600;
var curAppiumCmdId = -1;
var user = null;
var settings = null;

var fileExists = function(filename) {
  var params = [];
  params = params.concat(['-f', filename]);
  var res = system.performTaskWithPathArgumentsTimeout("/bin/test", params, 3);
  if (res.exitCode === 0) {
    return true;
  } else {
    return false;
  }
};

var sysExec = function(cmd) {
  var params = [];
  if (user !== null) {
    if (fileExists('/Users/' + user + '/.profile')) {
      params = params.concat(['--rcfile', '/Users/' + user + '/.profile']);
    } else {
      if (fileExists('/Users/' + user + '/.bash_profile')) {
        params = params.concat(['--rcfile', '/Users/' + user + '/.bash_profile']);
      } else {
        if (fileExists('/Users/' + user + '/.bashrc')) {
          params = params.concat(['--rcfile', '/Users/' + user + '/.bashrc']);
        }
      }
    }
  }
  params = params.concat(['-c', cmd]);
  var res = system.performTaskWithPathArgumentsTimeout("/bin/bash",
      params, 3);
  if (res.exitCode !== 0) {
    throw new Error("Failed executing the command " + cmd + " (exit code " + res.exitCode + ")");
  } else {
    var output = res.stdout.trim();
    if (output.length) {
      return output;
    } else {
      throw new Error("Executing " + cmd + " failed since there was no output");
    }
  }
};

user = function() {
  try {
    var ret = sysExec("whoami");
    console.log("Instruments shell user: " + ret);
    return ret;
  } catch (e) {
    console.log("Error getting user: " + e.message);
    return null;
  }
}();

settings = function() {
  var data = {};
  var settingsFile = "/Users/" + user + "/.instruments.conf";

  if (fileExists(settingsFile)) {
    var lines = sysExec("/bin/cat " + settingsFile).split('\n');
    for (var index = 0; index < lines.length; index++) {
      var line = lines[index];
      if (line[0] === '#') continue;
      if (line.indexOf('=') !== -1) {
        var parts = line.split('=');
        if (parts.length !== 2) {
          throw new Error("Error reading " + settingsFile);
        }
        data[parts[0]] = parts[1];
      }
    }
    if (data.length > 0) {
      console.log("Read in settings: ");
    }
    for (var key in data) {
      if (data.hasOwnProperty(key)) {
        console.log("  " + key + ": " + data[key]);
      }
    }
    return data;
  }
}();

// get npm-installed instruments_client bin if necessary
var globalPath = (function() {
  try {
    return sysExec('which instruments_client');
  } catch (e) {
    return null;
  }
})();

// figure out where instruments client is (relative to where appium is run)
var clientPath = (function() {
  var client = 'bin/instruments-client.js';
  var module = 'node_modules/appium/';

  try {
    sysExec('ls ' + client);
    return client;
  } catch(e) {
    try {
      sysExec('ls ' + module + client);
      return module + client;
    } catch(e) {
      if (globalPath === null) {
        console.log("WARNING: could not find bin/instruments-client.js in its " +
                    "usual place, and global instruments_client not around " +
                    "either. This could cause problems");
      }
    }
  }
})();

// figure out where node is
var nodePath = (function() {
  var path = null;
  if (typeof settings !== "undefined") {
    if ('NODE_BIN' in settings) {
      console.log("Using settings override for NODE_BIN: " + settings.NODE_BIN);
      return settings.NODE_BIN;
    }
  }

  // not in the settings file, so let's try and find it...
  try {
    path = sysExec("echo $NODE_BIN");
    console.log("Found node using $NODE_BIN: " + path);
  } catch(e) {
    try {
      path = sysExec('which node');
      console.log("Found node using `which node`: " + path);
    } catch (e) {
      var appScript = [
          'try'
        , '  set appiumIsRunning to false'
        , '  tell application "System Events"'
        , '    set appiumIsRunning to name of every process contains "Appium"'
        , '  end tell'
        , '  if appiumIsRunning then'
        , '    tell application "Appium" to return node path'
        , '  end if'
        , 'end try'
        , 'return "NULL"'
      ].join("\n");
      var appNodeWorked = false;
      try {
        path = sysExec("osascript -e '" + appScript + "'");
        appNodeWorked = path !== "NULL";
      } catch(e) {}
      if (!appNodeWorked) {
        try {
          path = sysExec("ls /usr/local/bin/node");
          console.log("Found node at " + path);
        } catch (e) {
          try {
            path = sysExec("ls /opt/local/bin/node");
            console.log("Found node at " + path);
          } catch (e) {
            throw new Error("Could not find node using `which node`, at /usr/" +
                            "local/bin/node, at /opt/local/bin/node, at " +
                            "$NODE_BIN, or by querying Appium.app. Where is " +
                            "it?");
          }
        }
      } else {
        console.log("Found node in Appium.app");
      }
    }
  }
  return path;
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
    , binaryPath = nodePath;
  if (isAppiumApp) {
    globalPath = null;
  }
  if (globalPath === null) {
    args.unshift(clientPath);
  } else {
    args.unshift(globalPath);
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
    var cmd = binaryPath + " " + args.join(" ");
    console.log("Instruments client (" + cmd + ") exited with " + res.exitCode +
                ", here's stderr:");
    console.log(res.stderr);
    console.log("And stdout:");
    console.log(res.stdout);
  }
  return res.stdout;
};

var getFirstCommand = function() {
  return sendResultAndGetNext();
};
