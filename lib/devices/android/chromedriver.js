"use strict";

var proxyTo = require('../common.js').proxyTo
  , _ = require('underscore')
  , logger = require('../../server/logger.js').get('appium')
  , exec = require('child_process').exec
  , spawn = require('child_process').spawn
  , async = require('async')
  , through = require('through')
  , isWindows = require('../../helpers.js').isWindows()
  , isLinux = require('../../helpers.js').isLinux()
  , path = require('path')
  , fs = require('fs');

var Chromedriver = function (args, onDie) {
  this.proxyHost = '127.0.0.1';
  this.proxyPort = args.port || 9515;
  this.deviceId = args.deviceId;
  this.enablePerformanceLogging = args.enablePerformanceLogging;
  this.proc = null;
  this.onChromedriverStart = null;
  this.onDie = onDie;
  this.exitCb = null;
  this.shuttingDown = false;
  this.executable = args.executable;
};

Chromedriver.prototype.initChromedriverPath = function (cb) {
  if (this.executable) {
    this.chromedriver = this.executable;
  } else {
    var setPath = function (platform, executable) {
      this.chromedriver = path.resolve(__dirname, "..", "..", "..", "build",
                                       "chromedriver", platform, executable);
      logger.debug("Set chromedriver binary as: " + this.chromedriver);
    }.bind(this);
    if (isLinux) {
      logger.debug("Determining linux architecture");
      exec("uname -m", function (err, stdout) {
        var executable;
        if (err) return cb(err);
        if (stdout.trim() === "i686") {
          executable = "chromedriver32";
        } else {
          executable = "chromedriver64";
        }
        setPath("linux", executable);
        cb();
      });
    } else {
      var executable = isWindows ? "chromedriver.exe" : "chromedriver";
      var platform = isWindows ? "windows" : "mac";
      setPath(platform, executable);
      cb();
    }
  }
};

Chromedriver.prototype.ensureChromedriverExists = function (cb) {
  logger.debug("Ensuring Chromedriver exists");
  fs.exists(this.chromedriver, function (exists) {
    if (!exists) return cb(new Error("Could not find chromedriver. Need to run reset script?"));
    cb();
  });
};

Chromedriver.prototype.killOldChromedrivers = function (cb) {
  var cmd;
  if (isWindows) {
    cmd = "FOR /F \"usebackq tokens=5\" %%a in (`netstat -nao ^| findstr /R /C:\"" + this.proxyPort + " \"`) do (" +
            "FOR /F \"usebackq\" %%b in (`TASKLIST /FI \"PID eq %%a\" ^| findstr /I chromedriver.exe`) do (" +
              "IF NOT %%b==\"\" TASKKILL /F /PID %%b" +
            ")" +
          ")";
  } else {
    cmd = "ps -ef | grep " + this.chromedriver + " | grep -v grep |" +
      "grep -e '--port=" + this.proxyPort + "$' | awk '{ print $2 }' | " +
      "xargs kill -15";
  }
  logger.debug("Killing any old chromedrivers, running: " + cmd);
  exec(cmd, function (err) {
    if (err) {
      logger.debug("No old chromedrivers seemed to exist");
    } else {
      logger.debug("Successfully cleaned up old chromedrivers");
    }
    cb();
  });
};

Chromedriver.prototype.start = function (cb) {
  this.onChromedriverStart = cb;
  logger.debug("Spawning chromedriver with: " + this.chromedriver);
  var alreadyReturned = false;
  var args = ["--url-base=wd/hub", "--port=" + this.proxyPort];
  this.proc = spawn(this.chromedriver, args);
  this.proc.stdout.setEncoding('utf8');
  this.proc.stderr.setEncoding('utf8');

  this.proc.on('error', function (err) {
    logger.error('Chromedriver process failed with error: ' + err.message);
    alreadyReturned = true;
    this.shuttingDown = true;
    logger.error('Killing chromedriver');
    this.proc.kill();
    this.onDie();
  }.bind(this));

  this.proc.stdout.pipe(through(function (data) {
    logger.debug('[CHROMEDRIVER] ' + data.trim());
    if (!alreadyReturned && data.indexOf('Starting ') === 0) {
      this.chromedriverStarted = true;
      alreadyReturned = true;
      return cb();
    }
  }.bind(this)));

  this.proc.stderr.pipe(through(function (data) {
    logger.debug('[CHROMEDRIVER STDERR] ' + data.trim());
  }));

  this.proc.on('exit', this.onClose.bind(this));
  this.proc.on('close', this.onClose.bind(this));
};

Chromedriver.prototype.onClose = function (code, signal) {
  if (!this.shuttingDown) {
    this.shuttingDown = true;
    logger.debug("Chromedriver exited with code " + code);
    if (signal) {
      logger.debug("(killed by signal " + signal + ")");
    }
    if (!this.chromedriverStarted) {
      return this.onChromedriverStart(
          new Error("Chromedriver quit before it was available"));
    }
    if (this.exitCb !== null) {
      return this.exitCb();
    }
    this.onDie();
  }
};

Chromedriver.prototype.createSession = function (caps, cb) {
  logger.debug("Creating Chrome session");
  caps.chromeOptions.androidDeviceSerial = this.deviceId;
  if (this.enablePerformanceLogging) {
    caps.loggingPrefs = {performance: 'ALL'};
  }
  var data = {
    sessionId: null,
    desiredCapabilities: caps
  };
  async.waterfall([
    this.initChromedriverPath.bind(this),
    this.ensureChromedriverExists.bind(this),
    this.killOldChromedrivers.bind(this),
    this.start.bind(this),
    _.partial(this.proxyNewSession.bind(this), data)
  ], cb);
};

Chromedriver.prototype.proxyNewSession = function (data, cb) {
  var maxRetries = 5;
  var curRetry = 0;
  var retryInt = 500;
  var doProxy = function (alreadyRestarted) {
    this.proxyTo('/wd/hub/session', 'POST', data, function (err, res, body) {
      if (err) {
        if (/ECONNREFUSED/.test(err.message) && curRetry < maxRetries) {
          logger.debug("Could not connect yet; retrying");
          curRetry++;
          setTimeout(doProxy, retryInt);
          return;
        }
        return cb(err);
      }

      // first checking if we get a well formed success response
      this.chromeSessionId = null;
      try {
        if (body.status === 0 && body.sessionId) {
          logger.debug("Successfully started chrome session");
          this.chromeSessionId = body.sessionId;
        }
      } catch (ignore) {}
      if (this.chromeSessionId) return cb(null, this.chromeSessionId);

      // then check redirect success case
      try {
        if (res.statusCode === 303 && res.headers.location) {
          logger.debug("Successfully started chrome session");
          var loc = res.headers.location;
          this.chromeSessionId = /\/([^\/]+)$/.exec(loc)[1];
        }
      } catch (ignore) {}
      if (this.chromeSessionId) return cb(null, this.chromeSessionId);

      // those are error cases
      if (typeof body !== "undefined" &&
                 typeof body.value !== "undefined" &&
                 typeof body.value.message !== "undefined" &&
                 body.value.message.indexOf("Failed to run adb command") !== -1) {
        logger.error("Chromedriver had trouble running adb");
        if (!alreadyRestarted) {
          logger.error("Restarting adb for chromedriver");
          return this.adb.restartAdb(function () {
            this.adb.getConnectedDevices(function () {
              doProxy(true);
            }.bind(this));
          }.bind(this));
        } else {
          cb(new Error("Chromedriver wasn't able to use adb. Is the server up?"));
        }
      } else {
        logger.error("Chromedriver create session did not work. Status was " +
                     res.statusCode + " and body was " +
                     JSON.stringify(body));
        cb(new Error("Did not get session redirect from Chromedriver"));
      }
    }.bind(this));
  }.bind(this);

  doProxy();
};

Chromedriver.prototype.deleteSession = function (cb) {
  logger.debug("Deleting Chrome session");
  var url = '/wd/hub/session/' + this.chromeSessionId;
  this.proxyTo(url, 'DELETE', null, function (err, res) {
    if (err) return cb(err);
    if (res.statusCode !== 200) return cb(new Error("Status was not 200"));
    cb();
  }.bind(this));
};

Chromedriver.prototype.stop = function (cb) {
  logger.debug('Killing chromedriver');
  this.exitCb = cb;
  this.proc.kill();
};

Chromedriver.prototype.proxyTo = proxyTo;

module.exports = Chromedriver;
