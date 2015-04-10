"use strict";

var spawn = require('win-spawn')
  , through = require('through')
  , path = require('path')
  , fs = require('fs')
  , _ = require('underscore')
  , which = require('which')
  , glob = require('glob')
  , logger = require('../../server/logger.js').get('appium')
  , async = require('async')
  , mkdirp = require('mkdirp')
  , touch = require('touch')
  , xcode = require('../../future.js').xcode;

// Date-Utils: Polyfills for the Date object
require('date-utils');

var START_TIMEOUT = 10000;

var IosLog = function (opts) {
  this.udid = opts.udid;
  this.simUdid = opts.simUdid;
  this.showLogs = opts.showLogs;
  this.proc = null;
  this.onIosLogStart = null;
  this.iosLogStarted = false;
  this.iosLogStartTime = null;
  this.calledBack = false;
  this.loggingModeOn = true;
  this.logs = [];
  this.logRow = "";
  this.logsSinceLastRequest = [];
  this.startTimer = null;

};

IosLog.prototype.startCapture = function (cb) {
  cb = _.once(cb); // only respond once
  this.onIosLogStart = cb;
  // Select cmd for log capture
  if (this.udid) {
    this.loggingModeOn = false;
    var spawnEnv = _.clone(process.env);

    logger.debug("Attempting iOS device log capture via libimobiledevice idevicesyslog");
    which("idevicesyslog", function (err) {
      if (!err) {
        try {
          this.proc = spawn("idevicesyslog", {env: spawnEnv});
        } catch (e) {
          cb(e);
        }
      } else {
        logger.warn("Could not capture device log using libimobiledevice idevicesyslog. Libimobiledevice probably isn't installed");
        logger.debug("Attempting iOS device log capture via deviceconsole");
        var limdDir = path.resolve(__dirname,
                                   "../../../build/deviceconsole");
        spawnEnv.PATH = process.env.PATH + ":" + limdDir;
        spawnEnv.DYLD_LIBRARY_PATH = limdDir + ":" + process.env.DYLD_LIBRARY_PATH;

        // deviceconsole retrieves many old device log lines that came before it was
        // started so filter those out until we encounter new log lines.
        try {
          this.proc = spawn("deviceconsole", ["-u", this.udid], {env: spawnEnv});
        } catch (e) {
          cb(e);
        }
      }

      this.finishStartingLogCapture(cb);
    }.bind(this));

  } else {
    xcode.getVersion(function (err, xcodeVersion) {
      if (err) return cb(err);

      var ver = parseInt(xcodeVersion.split(".")[0], 10);
      if (ver >= 5) {
        var logsPath;
        if (ver >= 6) {
          logger.debug("Starting iOS 8.* simulator log capture");
          if (_.isUndefined(this.simUdid)) {
            return cb(new Error("iOS8 log capture requires a sim udid"));
          }
          logsPath = path.resolve(process.env.HOME, "Library", "Logs",
                                  "CoreSimulator", this.simUdid);
        } else {
          logger.debug("Starting iOS 7.* simulator log capture");
          logsPath = path.resolve(process.env.HOME, "Library", "Logs",
                                  "iOS Simulator", "7.*");
        }
        var errOnlyCb = function (cb) { return function (err) { cb(err); }; }; // makes waterfall safer

        var touchLog = function (cb) {
          if (logsPath.indexOf('*') >= 0) {
            return cb();
          }
          async.series([
            function (cb) { mkdirp(logsPath, errOnlyCb(cb)); },
            function (cb) { touch(path.resolve(logsPath, "system.log"), errOnlyCb(cb)); },
            function (cb) {
              fs.appendFile(
                path.resolve(logsPath, "system.log"),
                'A new simulator is about to start!',
                errOnlyCb(cb));
            }
          ], errOnlyCb(cb));
        };

        var getLogFiles = function (cb) {
          glob(path.resolve(logsPath, "system.log"), function (err, files) {
            if (err || files.length < 1) {
              logger.error("Could not start log capture because no iOS " +
                "simulator logs could be found at " + logsPath + "/system.log" +
                "Logging will not be functional for this run");
              return cb(new Error('Could not start log capture'));
            }
            cb(null, files);
          });
        };

        var tailLogs = function (files, cb) {
          var lastModifiedLogPath = files[0]
            , lastModifiedLogTime = fs.statSync(files[0]).mtime;
          _.each(files, function (file) {
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
        }.bind(this);

        async.waterfall([touchLog, getLogFiles, tailLogs], function (err) {
          if (err) {
            logger.warn('System log capture failed.');
          }
          cb();
        });
      } else {
        logger.debug("Starting iOS 6.* simulator log capture");
        this.proc = spawn("tail", ["-f", "-n", "1", "/var/log/system.log"]);
        this.finishStartingLogCapture(cb);
      }
    }.bind(this));
  }
};

IosLog.prototype.finishStartingLogCapture = function (cb) {
  if (!this.proc) {
    var msg = "Could not capture device log";
    logger.warn(msg);
    return cb(new Error(msg));
  }

  this.startTimer = setTimeout(function () {
    var msg = "Log capture did not start in a reasonable amount of time";
    logger.error(msg);
    if (!this.calledBack) {
      this.calledBack = true;
      cb(new Error(msg));
    }
  }, START_TIMEOUT);
  this.proc.stdout.setEncoding('utf8');
  this.proc.stderr.setEncoding('utf8');
  this.proc.on('error', function (err) {
    clearTimeout(this.startTimer);
    logger.error("iOS log capture failed: " + err.message);
    if (!this.calledBack) {
      this.calledBack = true;
      cb(err);
    }
  }.bind(this));
  this.proc.stdout.pipe(through(this.onStdout.bind(this)));
  this.proc.stderr.pipe(through(this.onStderr.bind(this)));
};

IosLog.prototype.stopCapture = function () {
  logger.debug("Stopping iOS log capture");
  if (this.proc) {
    this.proc.kill();
  }
  this.proc = null;
};

IosLog.prototype.onStdout = function (data) {
  clearTimeout(this.startTimer);
  if (!this.calledBack) {
    // don't store the first line of the log because it came before the sim or device was launched
    this.onOutput(data);
  } else {
    this.logRow += data;
    if (data.substr(-1, 1) === "\n") {
      this.onOutput(data, "");
      this.logRow = "";
    }
  }
};

IosLog.prototype.onStderr = function (data) {
  clearTimeout(this.startTimer);
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

IosLog.prototype.onOutput = function (data, prefix) {
  if (!this.iosLogStarted) {
    this.iosLogStarted = true;
    this.iosLogStartTime = new Date();
    if (!this.calledBack) {
      this.calledBack = true;
      this.onIosLogStart();
    }
  }
  var logs = this.logRow.split("\n");
  _.each(logs, function (log) {
    log = log.trim();
    if (log) {
      // Turn logging on when the 1st row that has a new date comes through.
      // - Some system.log lines do not have a leading date and therefore never pass the
      //   logRowDate.isAfter(this.iosLogStartTime) check so we require a state flag here,
      //   otherwise all the lines without dates get filtered out even if they are new.
      if (!this.loggingModeOn) {
        var logRowParts = log.split(/\s+/);
        var logRowDate = new Date(
          Date.parse(this.iosLogStartTime.getFullYear() + " " + logRowParts[0] + " " + logRowParts[1] + " " + logRowParts[2])
        );
        if (logRowDate.isAfter(this.iosLogStartTime)) {
          this.loggingModeOn = true;
        }
      }
      if (this.loggingModeOn) {
        var logObj = {
          timestamp: Date.now()
        , level: 'ALL'
        , message: log
        };
        this.logs.push(logObj);
        this.logsSinceLastRequest.push(logObj);
        if (this.showLogs) logger.info('[IOS_SYSLOG_ROW ' + prefix + '] ' + log);
      }
    }
  }.bind(this));
};

IosLog.prototype.getLogs = function () {
  var ret = this.logsSinceLastRequest;
  this.logsSinceLastRequest = [];
  return ret;
};

IosLog.prototype.getAllLogs = function () {
  return this.logs;
};

module.exports = function (opts) {
  return new IosLog(opts);
};
