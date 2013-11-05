"use strict";

var spawn = require('win-spawn')
  , through = require('through')
  , _ = require('underscore')
  , logger = require('../../server/logger.js').get('appium');

// Date-Utils: Polyfills for the Date object
require('date-utils');

var IosLog = function(opts) {
  this.udid = opts.udid;
  this.xcodeVersion = opts.xcodeVersion;
  this.debugMode = opts.debug;
  this.debugTrace = opts.debugTrace;
  this.proc = null;
  this.onIosLogStart = null;
  this.iosLogStarted = false;
  this.iosLogStartTime = null;
  this.calledBack = false;
  this.logs = [];
  this.logRow = "";
  this.logsSinceLastRequest = [];
};

IosLog.prototype.debug = function(msg) {
  if (this.debugMode) {
    logger.debug(("[IOS_SYSLOG_CAPTURE] " + msg).grey);
  }
};

IosLog.prototype.startCapture = function(cb) {
  this.onIosLogStart = cb;
  // Select cmd for log capture
  if (this.udid) {
    var spawnEnv = _.clone(process.env);
    spawnEnv.PATH = process.env.PATH + ":" + process.cwd() + "/build/libimobiledevice-macosx/";
    spawnEnv.DYLD_LIBRARY_PATH = process.cwd() + "/build/libimobiledevice-macosx/:" + process.env.DYLD_LIBRARY_PATH;
    this.debug("Starting iOS device log capture via idevicesyslog");
    this.proc = spawn("idevicesyslog", ["-u", this.udid], {env: spawnEnv});
  }
  else {
    if (parseInt(this.xcodeVersion.split(".")[0], 10) >= 5) {
      this.debug("Starting iOS 7.* simulator log capture");
      this.proc = spawn("tail", ["-f", "-n1", process.env.HOME + "/Library/Logs/iOS Simulator/7.0/system.log"]);
    }
    else {
      this.debug("Starting iOS 6.* simulator log capture");
      this.proc = spawn("tail", ["-f", "-n1", "/var/log/system.log"]);
    }
  }
  this.proc.stdout.setEncoding('utf8');
  this.proc.stderr.setEncoding('utf8');
  this.proc.on('error', function(err) {
    logger.error("iOS log capture failed: " + err.message);
    if (!this.calledBack) {
      this.calledBack = true;
      cb(err);
    }
  }.bind(this));
  this.proc.stdout.pipe(through(this.onStdout.bind(this)));
  this.proc.stderr.pipe(through(this.onStderr.bind(this)));
};

IosLog.prototype.stopCapture = function() {
  this.debug("Stopping iOS log capture");
  this.proc.kill();
  this.proc = null;
};

IosLog.prototype.onStdout = function(data) {
  this.logRow += data;
  if (data.substr(-1,1) == "\n") {
    this.onOutput(data, "");
    this.logRow = "";
  }
};

IosLog.prototype.onStderr = function(data) {
  if (/execvp\(\)/.test(data)) {
    logger.error("iOS log capture process failed to start");
    if (!this.calledBack) {
      this.calledBack = true;
      this.onIosLogStart(new Error("iOS log capture process failed to start"));
      return;
    }
  }
  this.onOutput(data, ' STDERR');
};

IosLog.prototype.onOutput = function(data, prefix) {
  if (!this.iosLogStarted) {
    this.iosLogStarted = true;
    this.iosLogStartTime = new Date();
    if (!this.calledBack) {
      this.calledBack = true;
      this.onIosLogStart();
    }
  }
  var logs = this.logRow.split("\n");
  _.each(logs, function(log) {
    log = log.trim();
    if (log) {
      // Filter old log rows
      var logRowParts = log.split(" ");
      var logRowDate = new Date(
        Date.parse(this.iosLogStartTime.getFullYear() + " " + logRowParts[0] + " " + logRowParts[2] + " " + logRowParts[3])
      );
      if (logRowDate.isAfter(this.iosLogStartTime)) {
        var logObj = {
          timestamp: Date.now()
          , level: 'ALL'
          , message: log
        };
        this.logs.push(logObj);
        this.logsSinceLastRequest.push(logObj);
        if (this.debugMode && this.debugTrace) {
          logger.debug('[IOS_SYSLOG_ROW ' + prefix + '] ' + log);
        }
      }
    }
  }.bind(this));
};

IosLog.prototype.getLogs = function() {
  var ret = this.logsSinceLastRequest;
  this.logsSinceLastRequest = [];
  return ret;
};

IosLog.prototype.getAllLogs = function() {
  return this.logs;
};

module.exports = function(opts) {
  return new IosLog(opts);
};