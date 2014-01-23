"use strict";

var spawn = require('win-spawn')
  , through = require('through')
  , path = require('path')
  , fs = require('fs')
  , _ = require('underscore')
  , glob = require('glob')
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
  this.logNoColors = opts.logNoColors;

  if (this.xcodeVersion === null) {
    logger.warn("Xcode version passed into log capture code as null, assuming Xcode 5");
    this.xcodeVersion = '5.0';
  }

};

IosLog.prototype.debug = function(msg) {
  if (this.debugMode) {
    var log = "[IOS_SYSLOG_CAPTURE] " + msg;
    if (!this.logNoColors) {
      log = log.grey;
    }
    logger.debug(log);
  }
};

IosLog.prototype.startCapture = function(cb) {
  this.onIosLogStart = cb;
  // Select cmd for log capture
  if (this.udid) {
    var spawnEnv = _.clone(process.env);
    var limdDir = path.resolve(__dirname,
                               "../../../build/libimobiledevice-macosx/");
    spawnEnv.PATH = process.env.PATH + ":" + limdDir;
    spawnEnv.DYLD_LIBRARY_PATH = limdDir + ":" + process.env.DYLD_LIBRARY_PATH;
    logger.info("Starting iOS device log capture via idevicesyslog");
    this.proc = spawn("idevicesyslog", ["-u", this.udid], {env: spawnEnv});
    this.finishStartingLogCapture(cb);
  } else {
    if (parseInt(this.xcodeVersion.split(".")[0], 10) >= 5) {
      logger.info("Starting iOS 7.* simulator log capture");
      var sim7LogsPath = path.resolve(process.env.HOME, "Library", "Logs", "iOS Simulator");
      glob(sim7LogsPath + "/7.*/system.log", function(err, files) {
        if (err || files.length < 1) {
          logger.error("Could not start log capture because no iOS 7 " +
            "simulator logs could be found at " + sim7LogsPath + "/7.*. " +
            "Logging will not be functional for this run");
          return cb();
        } else {
          var lastModifiedLogPath = files[0]
            , lastModifiedLogTime = fs.statSync(files[0]).mtime;
          _.each(files, function(file) {
            var mtime = fs.statSync(file).mtime;
            if (mtime > lastModifiedLogTime) {
              lastModifiedLogPath = file;
              lastModifiedLogTime = mtime;
            }
          });
          this.proc = spawn("tail", ["-f", "-n", "1", lastModifiedLogPath]);
          // -n 1 is used so that tail returns a line that lets this process know that the
          // first line returned wasn't from stderr so it can tell the tailing was successful
          this.finishStartingLogCapture(cb);
        }
      }.bind(this));
    } else {
      logger.info("Starting iOS 6.* simulator log capture");
      this.proc = spawn("tail", ["-f", "-n", "1", "/var/log/system.log"]);
      this.finishStartingLogCapture(cb);
    }
  }
};

IosLog.prototype.finishStartingLogCapture = function(cb) {
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
  logger.info("Stopping iOS log capture");
  this.proc.kill();
  this.proc = null;
};

IosLog.prototype.onStdout = function(data) {
  if (!this.calledBack) {
    // don't store the first line of the log because it came before the sim or device was launched
    this.onOutput(data);
  } else {
  this.logRow += data;
    if (data.substr(-1,1) == "\n") {
      this.onOutput(data, "");
      this.logRow = "";
    }
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
        Date.parse(this.iosLogStartTime.getFullYear() + " " + logRowParts[0] + " " + logRowParts[1] + " " + logRowParts[2])
      );
      if (!this.udid || logRowDate.isAfter(this.iosLogStartTime)) {
        var logObj = {
          timestamp: Date.now()
          , level: 'ALL'
          , message: log
        };
        this.logs.push(logObj);
        this.logsSinceLastRequest.push(logObj);
        if (this.debugMode || this.debugTrace) {
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
