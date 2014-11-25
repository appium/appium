"use strict";
var path = require('path')
  , fs = require('fs')
  , env = process.env
  , exec = require('child_process').exec
  , async = require('async');

require("./common.js");

function IOSChecker(log) {
  this.log = log;
  this.osVersion = null;
}
exports.IOSChecker = IOSChecker;

IOSChecker.prototype.runAllChecks = function (cb) {
  async.series([
    this.getMacOSXVersion.bind(this),
    this.checkForXcode.bind(this),
    this.checkForXcodeCommandLineTools.bind(this),
    this.checkDevToolsSecurity.bind(this),
    this.checkAuthorizationDB.bind(this),
    this.checkForNodeBinary.bind(this)
  ], cb);
};

IOSChecker.prototype.getMacOSXVersion = function (cb) {
  exec("sw_vers -productVersion", function (err, stdout) {
    if (err === null) {
      if (stdout.match('10.8') !== null) {
        this.osVersion = '10.8';
        cb(null, "Mac OS X 10.8 is installed.");
      } else if (stdout.match('10.9') !== null) {
        this.osVersion = '10.9';
        cb(null, "Mac OS X 10.9 is installed.");
      } else if ((stdout.match('10.10') !== null) || (stdout.match('10.10.1') !== null)) {
        this.osVersion = '10.10';
        cb(null, "Mac OS X 10.10 is installed.");
      } else {
        this.log.fail("Could not detect Mac OS X Version", cb);
      }
    } else {
      this.log.fail("Unknown SW Version Command: " + err, cb);
    }
  }.bind(this));
};

IOSChecker.prototype.checkForXcode = function (cb) {
  var msg;
  exec("xcode-select --print-path", { maxBuffer: 524288}, function (err, stdout) {
    if (err === null) {
      var xcodePath = stdout.replace("\n", "");
      if (fs.existsSync(xcodePath)) {
        this.log.pass("Xcode is installed at " + xcodePath, cb);
      } else {
        msg = "Xcode is not installed.";
        this.log.fail(msg);
        this.log.promptToFix("Xcode is not installed.", function () {
          this.installXcode(cb);
        }.bind(this), function () {
          cb(msg, msg);
        });
      }
    } else {
      msg = "Xcode is not installed: " + err;
      this.log.fail(msg);
      this.log.promptToFix("Xcode is not installed.", function () {
        this.installXcode(cb);
      }.bind(this), function () {
        cb(msg, msg);
      });
    }
  }.bind(this));
};

IOSChecker.prototype.checkForXcodeCommandLineTools = function (cb) {
  var msg;
  var pkgName = this.osVersion === '10.8' ? "com.apple.pkg.DeveloperToolsCLI" : "com.apple.pkg.CLTools_Executables";
  exec("pkgutil --pkg-info=" + pkgName, { maxBuffer: 524288}, function (err, stdout) {
    if (err === null) {
      var match = stdout.match(/install-time/);
      if (match !== null) {
        this.log.pass("Xcode Command Line Tools are installed.", cb);
      } else {
        msg = "Xcode Command Line Tools are NOT installed.";
        this.log.fail(msg);
        this.log.promptToFix("Xcode's command line tools are NOT installed.", function () {
          this.installXcodeCommandLineTools(cb);
        }.bind(this), function () {
          cb(msg, msg);
        });
      }
    } else {
      msg = "Xcode Command Line Tools are NOT installed: " + err;
      this.log.fail(msg);
      this.log.promptToFix("Xcode's command line tools are NOT installed.", function () {
        this.installXcodeCommandLineTools(cb);
      }.bind(this), function () {
        cb(msg, msg);
      });
    }
  }.bind(this));
};

IOSChecker.prototype.checkDevToolsSecurity = function (cb) {
  var msg;
  exec("DevToolsSecurity", { maxBuffer: 524288}, function (err, stdout) {
    if (err === null && stdout.match(/enabled/) !== null) {
      this.log.pass("DevToolsSecurity is enabled.", cb);
    } else {
      msg = 'DevToolsSecurity is not enabled.';
      this.log.fail(msg);
      this.log.promptToFix(msg, function () {
        this.authorizeIOS(this.checkDevToolsSecurity.bind(this), cb);
      }.bind(this), function () {
        cb(msg, msg);
      });
    }
  }.bind(this));
};

IOSChecker.prototype.checkAuthorizationDB = function (cb) {
  var msg;
  exec("security authorizationdb read system.privilege.taskport", { maxBuffer: 524288}, function (err, stdout) {
    if (err === null && (stdout.match(/is-developer/) !== null || stdout.match(/allow/) !== null)) {
      this.log.pass("The Authorization DB is set up properly.", cb);
    } else if (this.osVersion === '10.8') {
      fs.readFile('/etc/authorization', 'utf8', function (err, data) {
        if (err) {
          this.log.fail('The Authorization DB is NOT set up properly.', cb);
        } else {
          var match = data.match(/<key>system.privilege.taskport<\/key>\s*\n\s*<dict>\n\s*<key>allow-root<\/key>\n\s*(<true\/>)/);
          if (match !== null) {
            this.log.pass("The Authorization DB is set up properly.", cb);
          } else {
            this.log.fail('The Authorization DB is NOT set up properly.', cb);
          }
        }
      }.bind(this));
    } else {
      msg = 'The Authorization DB is NOT set up properly.';
      this.log.fail(msg);
      this.log.promptToFix(msg, function () {
        this.authorizeIOS(this.checkAuthorizationDB.bind(this), cb);
      }.bind(this), function () {
        cb(msg, msg);
      });
    }
  }.bind(this));
};

IOSChecker.prototype.checkForNodeBinary = function (cb) {
  this.checkForNodeBinaryInCommonPlaces(function (err, msg) {
    if (!err) {
      cb(null, msg);
    } else {
      this.checkForNodeBinaryUsingWhichCommand(function (err, msg) {
        if (!err) {
          cb(null, msg);
        } else {
          this.checkForNodeBinaryUsingAppleScript(function (err, msg) {
            if (!err) {
              cb(null, msg);
            } else {
              this.checkForNodeBinaryUsingAppiumConfigFile(function (err, msg) {
                if (!err) {
                  cb(null, msg);
                } else {
                  msg = 'The node binary could not be found.';
                  this.log.fail(msg);
                  this.log.promptToFix("The node binary could not be found.", function () {
                    this.setupNodeBinaryPath(cb);
                  }.bind(this), function () {
                    cb(msg, msg);
                  });
                }
              }.bind(this));
            }
          }.bind(this));
        }
      }.bind(this));
    }
  }.bind(this));
};

IOSChecker.prototype.checkForNodeBinaryInCommonPlaces = function (cb) {
  if (typeof env.NODE_BIN !== "undefined" && fs.existsSync(env.NODE_BIN)) {
    this.log.pass("Node binary found using NODE_BIN environment variable at " + env.NODE_BIN, cb);
  } else if (fs.existsSync('/usr/local/bin/node')) {
    this.log.pass("Node binary found at /usr/local/bin/node", cb);
  } else if (fs.existsSync('/opt/local/bin/node')) {
    this.log.pass("Node binary found at /opt/local/bin/node", cb);
  } else {
    var msg = 'Node binary could not be found in the usual places';
    cb(msg, msg);
  }
};

IOSChecker.prototype.checkForNodeBinaryUsingWhichCommand = function (cb) {
  var msg;
  exec("which node", { maxBuffer: 524288}, function (err, stdout) {
    if (err === null && fs.existsSync(stdout.replace("\n", ""))) {
      this.log.pass("Node binary found using which command at " + stdout.replace("\n", ""), cb);
    } else {
      msg = 'Node binary not found using the which command.';
      cb(msg, msg);
    }
  }.bind(this));
};

IOSChecker.prototype.checkForNodeBinaryUsingAppleScript = function (cb) {
  var msg;
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
  exec("osascript -e '" + appScript + "'", { maxBuffer: 524288}, function (err, stdout) {
    if (err === null && fs.existsSync(stdout.replace("\n", ""))) {
      this.log.pass("Node binary found using AppleScript at " + stdout.replace("\n", ""), cb);
    } else {
      msg = 'Node binary not found using AppleScript.';
      cb(msg, msg);
    }
  }.bind(this));
};

IOSChecker.prototype.checkForNodeBinaryUsingAppiumConfigFile = function (cb) {
  var msg = 'Node binary not found in the .appiumconfig.json file.';
  var appiumConfigPath = path.resolve(__dirname, "../..", ".appiumconfig.json");
  if (fs.existsSync(appiumConfigPath)) {
    fs.readFile(appiumConfigPath, 'utf8', function (err, data) {
      if (err === null) {
        try {
          var jsonobj = JSON.parse(data);
          if (typeof jsonobj.node_bin !== "undefined" && fs.existsSync(jsonobj.node_bin)) {
            this.log.pass("Node binary found using .appiumconfig.json at " + jsonobj.node_bin, cb);
          } else {
            cb(msg, msg);
          }
        } catch (jsonErr) {
          cb(msg, msg);
        }
      } else {
        cb(msg, msg);
      }
    }.bind(this));
  } else {
    cb(msg, msg);
  }
};

IOSChecker.prototype.installXcode = function (cb) {
  exec("xcode-select --install", { maxBuffer: 524288}, function () {
    this.log.promptToConfirmFix(function () {
      this.checkForXcode(cb);
    }.bind(this));
  }.bind(this));
};

IOSChecker.prototype.installXcodeCommandLineTools = function (cb) {
  exec("xcode-select --install", { maxBuffer: 524288}, function () {
    this.log.promptToConfirmFix(function () {
      this.checkForXcodeCommandLineTools(cb);
    }.bind(this));
  }.bind(this));
};

IOSChecker.prototype.authorizeIOS = function (outerCb, innerCb) {
  var authorizePath = path.resolve(__dirname, "../../bin", "authorize-ios.js");
  exec("'" + process.execPath + "' '" + authorizePath + "'", { maxBuffer: 524288}, function (err) {
    if (err) {
      this.log.error('Could not authorize iOS: ' + err);
    }
  }.bind(this)).on('exit', function () {
    this.log.promptToConfirmFix(function () {
      outerCb(innerCb);
    }.bind(this));
  }.bind(this));
};

IOSChecker.prototype.setupNodeBinaryPath = function (cb) {
  var appiumConfigPath = path.resolve(__dirname, "../../", ".appiumconfig.json");
  if (fs.existsSync(appiumConfigPath)) {
    fs.readFile(appiumConfigPath, 'utf8', function (err, data) {
      if (!err) {
        try {
          var jsonobj = JSON.parse(data);
          jsonobj.node_bin = process.execPath;
          fs.writeFile(appiumConfigPath, JSON.stringify(jsonobj), function () {
            this.checkForNodeBinary(cb);
          }.bind(this));
        } catch (jsonErr) {
          this.log.error("Could not setup node binary path in .appiumconfig.json. Error parsing JSON: " + jsonErr);
          this.checkForNodeBinary(cb);
        }
      } else {
        this.log.error("Could not setup node binary path in .appiumconfig.json. Error reading config: " + err);
        this.checkForNodeBinary(cb);
      }
    }.bind(this));
  } else {
    this.log.error('The .appiumconfig.json file was not found at ' + appiumConfigPath);
    this.exitDoctor();
  }
};
