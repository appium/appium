"use strict";
var path = require('path')
  , fs = require('fs')
  , env = process.env
  , exec = require('child_process').exec
  , common = require("./common.js")
  , async = require('async');

function IOSChecker(log) {
  this.log = log;
  this.osVersion = null;
}
exports.IOSChecker = IOSChecker;

IOSChecker.prototype.runAllChecks = function(cb) {
  async.series([
    this.getMacOSXVersion.bind(this),
    this.checkForXcode.bind(this),
    this.checkForXcodeCommandLineTools.bind(this),
    this.checkDevToolsSecurity.bind(this),
    this.checkAuthorizationDB.bind(this)
  ], cb);
};

IOSChecker.prototype.getMacOSXVersion = function(cb) {
  var msg;
  exec("sw_vers -productVersion", function(err, stdout) {
    if (err === null) {
      if (stdout.match('10.8') !== null) {
        this.osVersion = '10.8';
        cb(null, "Mac OS X 10.8 is installed.");
      } else if (stdout.match('10.9') !== null) {
        this.osVersion = '10.9';
        cb(null, "Mac OS X 10.9 is installed.");
      } else {
        msg = "Could not detect Mac OS X Version";
        this.log.fail(msg);
        cb(msg, msg);
      }
    } else {
      msg = "Unknown SW Version Command: " + err;
      this.log.fail(msg);
      cb(msg, msg);
    }
  }.bind(this));
};

IOSChecker.prototype.checkForXcode = function(cb) {
  var msg;
  exec("xcode-select --print-path", { maxBuffer: 524288}, function(err, stdout) {
    if (err === null) {
      var xcodePath = stdout.replace("\n","");
      if(fs.existsSync(xcodePath)) {
        msg = "Xcode is installed at " + xcodePath;
        this.log.pass(msg);
        cb(null, msg);
      } else {
        msg = "Xcode is not installed.";
        this.log.fail(msg);
        this.log.promptToFix("Xcode is not installed.", function() {
          this.installXcode(cb);
        }.bind(this), function() {
          cb(msg, msg);
        });
      }
    } else {
      msg = "Xcode is not installed: " + err;
      this.log.fail(msg);
      this.log.promptToFix("Xcode is not installed.", function() {
        this.installXcode(cb);
      }.bind(this), function() {
        cb(msg, msg);
      });
    }
  }.bind(this));
};

IOSChecker.prototype.checkForXcodeCommandLineTools = function(cb) {
  var msg;
  var pkgName = this.osVersion === '10.8' ? "com.apple.pkg.DeveloperToolsCLI" : "com.apple.pkg.CLTools_Executables";
  exec("pkgutil --pkg-info=" + pkgName, { maxBuffer: 524288}, function(err, stdout) {
    if (err === null) {
      var match = stdout.match(/install-time/);
      if (match !== null) {
        msg = "Xcode Command Line Tools are installed.";
        this.log.pass(msg);
        cb(null, msg);
      } else {
        msg = "Xcode Command Line Tools are NOT installed.";
        this.log.fail(msg);
        this.log.promptToFix("Xcode's command line tools are NOT installed.", function() {
          this.installXcodeCommandLineTools(cb);
        }.bind(this), function() {
          cb(msg, msg);
        });
      }
    } else {
      msg = "Xcode Command Line Tools are NOT installed: " + err;
      this.log.fail(msg);
      this.log.promptToFix("Xcode's command line tools are NOT installed.", function() {
        this.installXcodeCommandLineTools(cb);
      }.bind(this), function() {
        cb(msg, msg);
      });
    }
  }.bind(this));
};

IOSChecker.prototype.checkDevToolsSecurity = function(cb) {
  var msg;
  exec("DevToolsSecurity", { maxBuffer: 524288}, function(err, stdout) {
    if (err === null && stdout.match(/enabled/) !== null) {
      msg = "DevToolsSecurity is enabled.";
      this.log.pass(msg);
      cb(null, msg);
    } else {
      msg = 'DevToolsSecurity is not enabled.';
      this.log.fail(msg);
      this.log.promptToFix(msg, function() {
        this.authorizeIOS(this.checkDevToolsSecurity.bind(this), cb);
      }.bind(this), function() {
        cb(msg, msg);
      });
    }
  }.bind(this));
};

IOSChecker.prototype.checkAuthorizationDB = function(cb) {
  var msg;
  exec("security authorizationdb read system.privilege.taskport", { maxBuffer: 524288}, function(err, stdout) {
    if (err === null && stdout.match(/is-developer/) !== null) {
      msg = "The Authorization DB is set up properly.";
      this.log.pass(msg);
      cb(null, msg);
    } else {
      msg = 'The Authorization DB is NOT set up properly.';
      this.log.fail(msg);
      this.log.promptToFix(msg, function() {
        this.authorizeIOS(this.checkAuthorizationDB.bind(this), cb);
      }.bind(this), function() {
        cb(msg, msg);
      });
    }
  }.bind(this));
};

IOSChecker.prototype.installXcode = function(cb) {
  exec("xcode-select --install", { maxBuffer: 524288}, function() {
    this.log.promptToConfirmFix(function() {
      this.checkForXcode(cb);
    }.bind(this));
  }.bind(this));
};

IOSChecker.prototype.installXcodeCommandLineTools = function(cb) {
  exec("xcode-select --install", { maxBuffer: 524288}, function() {
    this.log.promptToConfirmFix(function() {
      this.checkForXcodeCommandLineTools(cb);
    }.bind(this));
  }.bind(this));
};

IOSChecker.prototype.authorizeIOS = function(outerCb, innerCb) {
  var authorizePath = path.resolve(__dirname, "../../bin", "authorize-ios.js");
  exec("'" + process.execPath + "' '" + authorizePath + "'" , { maxBuffer: 524288}, function(err,stdout) {
    if(err) {
      this.log.error('Could not authorize iOS: ' + err);
    }
  }.bind(this)).on('exit', function() {
    this.log.promptToConfirmFix(function() {
      outerCb(innerCb);
    }.bind(this));
  }.bind(this));
};
