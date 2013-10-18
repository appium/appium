"use strict";

var spawn = require('win-spawn')
  , through = require('through')
  , _ = require('underscore')
  , logger = require('../../server/logger.js').get('appium');

var IosLog = function(opts) {
  this.udid = opts.udid;
  this.debug = opts.debug;
  this.debugTrace = opts.debugTrace;
  this.proc = null;
  this.onIosLogStart = null;
  this.iosLogStarted = false;
  this.calledBack = false;
  this.logs = [];
  this.logRow;
};

IosLog.prototype.startCapture = function(cb) {
  this.onIosLogStart = cb;
  logger.info("Starting idevicesyslog capture");
  // Select cmd for log capture
  if (this.udid) {
    this.proc = spawn("idevicesyslog", ["-u", this.udid]);
  }
  else {
    this.proc = spawn("tail", ["-f", "/var/log/system.log"]);
  }
  this.proc.stdout.setEncoding('utf8');
  this.proc.stderr.setEncoding('utf8');
  this.proc.on('error', function(err) {
    logger.error('iOS log capture failed: ' + err.message);
    if (!this.calledBack) {
      this.calledBack = true;
      cb(err);
    }
  }.bind(this));
  this.proc.stdout.pipe(through(this.onStdout.bind(this)));
  this.proc.stderr.pipe(through(this.onStderr.bind(this)));
};

IosLog.prototype.stopCapture = function() {
  logger.info("Stopping iOS log capture");
  this.proc.kill();
  this.proc = null;
};

IosLog.prototype.onStdout = function(data) {
  this.onOutput(data, '');
};

IosLog.prototype.onStderr = function(data) {
  if (/execvp\(\)/.test(data)) {
    logger.error('iOS log capture process failed to start');
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
    if (!this.calledBack) {
      this.calledBack = true;
      this.onIosLogStart();
    }
  }
  // Idevicesyslogs return strange log string, it will be concatenated 
  this.logRow += data
  var logs = this.logRow.split("\n");
  _.each(logs, function(log) {
    log = log.trim();
    if (log) {
      this.logs.push({
        timestamp: Date.now()
        , level: 'ALL'
        , message: log
      });
      var isTrace = /W\/Trace/.test(data);
      if (this.debug && (!isTrace || this.debugTrace)) {
        logger.debug('[IOS_LOG_CAPTURE' + prefix + '] ' + log);
      }
    }
  }.bind(this));
};

IosLog.prototype.getLogs = function() {
  return this.logs;
};

module.exports = function(opts) {
  return new IosLog(opts);
};
