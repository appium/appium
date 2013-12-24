"use strict";

var path = require('path')
  , fs = require('fs')
  , _ = require('underscore')
  , glob = require('glob')
  , logger = require('../../server/logger.js').get('appium');

// Date-Utils: Polyfills for the Date object
require('date-utils');

var IosCrashLog = function() {
  this.prevLogs = [];

  this.logsSinceLastRequest = [];
  this.crashDir = path.resolve(process.env.HOME, "Library", "Logs", "DiagnosticReports");
};

IosCrashLog.prototype.getCrashes = function(cb) {
  glob(this.crashDir + "/*.crash", function(err, crashFiles) {
    if (err) {
      var msg = "There was a problem getting the crash list";
      logger.error(msg);
      cb(new Error(msg));
    }

    cb(null, crashFiles);

  }.bind(this));
};

IosCrashLog.prototype.filesToJSON = function(arr) {
  var logs = [];
  for (var i = 0; i < arr.length; i++) {
    var filename = path.resolve(this.crashDir, arr[i]);
    var stat = fs.statSync(filename);
    var logObj = {
      timestamp: stat.ctime,
      level: 'ALL',
      message: fs.readFileSync(filename, 'utf8')
    };
    logs.push(logObj);
  }
  return logs;
};

IosCrashLog.prototype.startCapture = function(cb) {
  this.getCrashes(function(err, fileList) {
    if (err) cb(err);

    this.prevLogs = fileList;
    cb(null);
  }.bind(this));
};

IosCrashLog.prototype.getLogs = function() {
  var crashFiles = glob.sync(this.crashDir + "/*.crash");
  var diff = _.difference(crashFiles, this.prevLogs, this.logsSinceLastRequest);
  this.logsSinceLastRequest = diff;

  return this.filesToJSON(diff);
};

IosCrashLog.prototype.getAllLogs = function() {
  var crashFiles = glob.sync(this.crashDir + "/*.crash");
  var logFiles = _.difference(crashFiles, this.prevLogs);
  return this.filesToJSON(logFiles);
};

module.exports = function() {
  return new IosCrashLog();
};
