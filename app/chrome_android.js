"use strict";

var Android = require('./android').Android
  , _ = require('underscore')
  , proxyTo = require('./device').proxyTo
  , logger = require('../logger').get('appium')
  , exec = require('child_process').exec
  , spawn = require('child_process').spawn
  , async = require('async')
  , through = require('through')
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
};

_.extend(ChromeAndroid.prototype, Android.prototype);

ChromeAndroid.prototype.start = function(cb, onDie) {
  this.adb = new adb(this.opts);
  this.onDie = onDie;
  async.waterfall([
    this.ensureChromedriverExists.bind(this),
    this.startChromedriver.bind(this),
    this.createSession.bind(this)
  ], cb);
};

ChromeAndroid.prototype.ensureChromedriverExists = function(cb) {
  logger.info("Ensuring Chromedriver exists");
  exec('which chromedriver', function(err, stdout) {
    if (err) return cb(new Error("Could not find chromedriver, is it on PATH?"));
    this.chromedriver = stdout.trim();
    cb();
  }.bind(this));
};

ChromeAndroid.prototype.startChromedriver = function(cb) {
  logger.info("Spawning chromedriver with: " + this.chromedriver);
  var alreadyReturned = false;
  var args = ["--url-base=wd/hub"];
  this.proc = spawn(this.chromedriver, args);
  this.proc.stdout.setEncoding('utf8');
  this.proc.stderr.setEncoding('utf8');

  this.proc.on('error', function(err) {
    logger.error('Chromedriver process failed with error: ' + err.message);
    alreadyReturned = true;
    this.onDie();
  }.bind(this));

  this.proc.stdout.pipe(through(function(data) {
    logger.info('[CHROMEDRIVER] ' + data.trim());
  }));

  this.proc.stderr.pipe(through(function(data) {
    logger.info('[CHROMEDRIVER STDERR] ' + data.trim());
  }));

  this.proc.on('exit', function(code) {
    logger.info("Chromedriver exited with code " + code);
    alreadyReturned = true;
    if (!this.chromedriverStarted) {
      return cb(new Error("Chromedriver quit before it was available"));
    }
    this.onDie();
  }.bind(this));

  // chromedriver detects that it's not on a TTY and doesn't give any output
  // to let us know it's started, so we just assume it started if it didn't
  // exit
  setTimeout(function() {
    if (!alreadyReturned) {
      cb();
    }
  }.bind(this), 500);
};

ChromeAndroid.prototype.createSession = function(cb) {
  logger.info("Creating Chrome session");
  var data = {
    sessionId: null,
    desiredCapabilities: {
      chromeOptions: {
        androidPackage: 'com.android.chrome'
      }
    }
  };
  this.proxyTo('/wd/hub/session', 'POST', data, function(err, res, body) {
    if (err) return cb(err);

    if (res.statusCode === 303 && res.headers.location) {
      logger.info("Successfully started chrome session");
      var loc = res.headers.location;
      this.chromeSessionId = /\/([^\/]+)$/.exec(loc)[1];
      cb(null, this.chromeSessionId);
    } else {
      logger.error("Chromedriver create session did not work. Status was " +
                   res.statusCode + " and body was " + body);
      cb(new Error("Did not get session redirect from Chromedriver"));
    }
  }.bind(this));
};

ChromeAndroid.prototype.deleteSession = function(cb) {
  var url = '/wd/hub/session/' + this.chromeSessionId;
  this.proxyTo(url, 'DELETE', null, function(err, res) {
    if (err) return cb(err);
    if (res.statusCode !== 200) return cb(new Error("Status was not 200"));
  }.bind(this));
};

ChromeAndroid.prototype.stop = function(cb) {
  this.proc.kill();
  async.series([
    this.adb.getConnectedDevices.bind(this.adb),
    this.adb.stopApp.bind(this.adb)
  ], function(err) {
    if (err) logger.error(err.message);
    cb(0);
  });
};

ChromeAndroid.prototype.proxyTo = proxyTo;

module.exports = function(opts) {
  return new ChromeAndroid(opts);
};
