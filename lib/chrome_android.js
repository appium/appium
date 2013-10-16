"use strict";

var Android = require('./android').Android
  , _ = require('underscore')
  , proxyTo = require('./device').proxyTo
  , logger = require('./server/logger.js').get('appium')
  , exec = require('child_process').exec
  , spawn = require('child_process').spawn
  , async = require('async')
  , through = require('through')
  , isWindows = require('./helpers').isWindows()
  , adb = require('../android/adb');

var ChromeAndroid = function(opts) {
  this.initialize(opts);
  this.opts = opts;
  this.isProxy = true;
  this.proxyHost = '127.0.0.1';
  this.proxyPort = opts.port || 9515;
  this.chromedriver = null;
  this.proc = null;
  this.chromedriverStarted = false;
  this.chromedriver = "chromedriver";
  this.adb = null;
  this.onDie = function() {};
  this.exitCb = null;
  this.shuttingDown = false;
};

_.extend(ChromeAndroid.prototype, Android.prototype);

ChromeAndroid.prototype.start = function(cb, onDie) {
  this.adb = new adb(this.opts);
  this.onDie = onDie;
  this.onChromedriverStart = null;
  async.waterfall([
    this.ensureChromedriverExists.bind(this),
    this.startChromedriver.bind(this),
    this.createSession.bind(this)
  ], cb);
};

ChromeAndroid.prototype.ensureChromedriverExists = function(cb) {
  logger.info("Ensuring Chromedriver exists");
  var cmd = isWindows ? "where chromedriver.exe" : "which chromedriver";
  exec(cmd, function(err, stdout) {
    if (err) return cb(new Error("Could not find chromedriver, is it on PATH?"));
    this.chromedriver = stdout.trim();
    cb();
  }.bind(this));
};

ChromeAndroid.prototype.startChromedriver = function(cb) {
  this.onChromedriverStart = cb;
  logger.info("Spawning chromedriver with: " + this.chromedriver);
  var alreadyReturned = false;
  var args = ["--url-base=wd/hub"];
  this.proc = spawn(this.chromedriver, args);
  this.proc.stdout.setEncoding('utf8');
  this.proc.stderr.setEncoding('utf8');

  this.proc.on('error', function(err) {
    logger.error('Chromedriver process failed with error: ' + err.message);
    alreadyReturned = true;
    this.shuttingDown = true;
    logger.error('Killing chromedriver');
    this.proc.kill();
    this.onDie();
  }.bind(this));

  this.proc.stdout.pipe(through(function(data) {
    logger.info('[CHROMEDRIVER] ' + data.trim());
    if (!alreadyReturned && data.indexOf('Starting ChromeDriver') === 0) {
      this.chromedriverStarted = true;
      alreadyReturned = true;
      return cb();
    }
  }.bind(this)));

  this.proc.stderr.pipe(through(function(data) {
    logger.info('[CHROMEDRIVER STDERR] ' + data.trim());
  }));

  this.proc.on('exit', this.onClose.bind(this));
  this.proc.on('close', this.onClose.bind(this));
};

ChromeAndroid.prototype.createSession = function(cb) {
  logger.info("Creating Chrome session");
  var pkg = 'com.android.chrome';
  if (this.opts.chromium) {
    pkg = 'org.chromium.chrome.testshell';
  }
  var data = {
    sessionId: null,
    desiredCapabilities: {
      chromeOptions: {
        androidPackage: pkg
      }
    }
  };
  this.proxyNewSession(data, cb);
};

ChromeAndroid.prototype.proxyNewSession = function(data, cb) {
  var maxRetries = 5;
  var curRetry = 0;
  var retryInt = 500;
  var doProxy = function(alreadyRestarted) {
    this.proxyTo('/wd/hub/session', 'POST', data, function(err, res, body) {
      if (err) {
        if (/ECONNREFUSED/.test(err.message) && curRetry < maxRetries) {
          logger.info("Could not connect yet; retrying");
          curRetry++;
          setTimeout(doProxy, retryInt);
          return;
        }
        return cb(err);
      }

      if (res.statusCode === 303 && res.headers.location) {
        logger.info("Successfully started chrome session");
        var loc = res.headers.location;
        this.chromeSessionId = /\/([^\/]+)$/.exec(loc)[1];
        cb(null, this.chromeSessionId);
      } else if (typeof body !== "undefined" &&
                 typeof body.value !== "undefined" &&
                 typeof body.value.message !== "undefined" &&
                 body.value.message.indexOf("Failed to run adb command") !== -1) {
        logger.error("Chromedriver had trouble running adb");
        if (!alreadyRestarted) {
          logger.error("Restarting adb for chromedriver");
          return this.adb.restartAdb(function() {
            this.adb.getConnectedDevices(function() {
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

ChromeAndroid.prototype.deleteSession = function(cb) {
  var url = '/wd/hub/session/' + this.chromeSessionId;
  this.proxyTo(url, 'DELETE', null, function(err, res) {
    if (err) return cb(err);
    if (res.statusCode !== 200) return cb(new Error("Status was not 200"));
  }.bind(this));
};

ChromeAndroid.prototype.stop = function(cb) {
  logger.info('Killing chromedriver');
  this.exitCb = cb;
  this.proc.kill();
};

ChromeAndroid.prototype.onClose = function(code, signal) {
  if (!this.shuttingDown) {
    this.shuttingDown = true;
    logger.info("Chromedriver exited with code " + code);
    if (signal) {
      logger.info("(killed by signal " + signal + ")");
    }
    if (!this.chromedriverStarted) {
      return this.onChromedriverStart(
          new Error("Chromedriver quit before it was available"));
    }
    async.series([
      this.adb.getConnectedDevices.bind(this.adb),
      this.adb.stopApp.bind(this.adb)
    ], function(err) {
      if (err) logger.error(err.message);
      if (this.exitCb !== null) {
        return this.exitCb();
      }
      this.onDie();
    }.bind(this));
  }
};

ChromeAndroid.prototype.proxyTo = proxyTo;

module.exports = function(opts) {
  return new ChromeAndroid(opts);
};
