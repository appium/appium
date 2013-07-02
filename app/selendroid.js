"use strict";

var errors = require('./errors')
  , adb = require('../android/adb')
  , _ = require('underscore')
  , request = require('./device').request
  , proxyTo = require('./device').proxyTo
  , logger = require('../logger').get('appium')
  , status = require("./uiauto/lib/status")
  , fs = require('fs')
  , async = require('async')
  , path = require('path')
  , UnknownError = errors.UnknownError;

var Selendroid = function(opts) {
  this.opts = opts;
  this.appWaitActivity = opts.appWaitActivity;
  this.serverApk = null;
  this.appPackage = opts.appPackage;
  this.desiredCaps = opts.desiredCaps;
  this.onStop = function() {};
  this.selendroidSessionId = null;
  this.adb = null;
  this.isProxy = true;
  this.proxyHost = 'localhost';
  this.proxyPort = opts.port;
};

Selendroid.prototype.start = function(cb) {
  logger.info("Starting selendroid server");
  var opts = _.clone(this.opts)
    , me = this;
  opts.devicePort = 8080;  // selendroid listens on 8080 on the device
  this.adb = new adb(opts);

  async.waterfall([
    function(cb) { me.ensureServerExists(cb); },
    function(cb) { me.adb.startSelendroid(me.serverApk, cb); },
    function(res, cb) { me.waitForServer(cb); },
    function(cb) { me.createSession(cb); },
  ], cb);
};

Selendroid.prototype.stop = function(cb) {
  logger.info("Stopping selendroid server");
  this.deleteSession(function(err) {
    cb(err ? 1 : 0);
  });
};

Selendroid.prototype.keyevent = function(keycode, cb) {
  this.adb.keyevent(keycode, function() {
    cb(null, {
      status: status.codes.Success.code
      , value: null
    });
  });
};

// Clear data, close app, then start app.
Selendroid.prototype.fastReset = function(cb) {
  var me = this;
  async.series([
    function(cb) { me.adb.runFastReset(cb); },
    function(cb) { me.adb.startApp(cb); },
  ], cb);
};

Selendroid.prototype.ensureServerExists = function(cb) {
  logger.info("Checking whether selendroid is built yet");
  var selBin = path.resolve(__dirname, "..", "build", "selendroid",
      "selendroid.apk");
  fs.stat(selBin, _.bind(function(err) {
    if (err) {
      logger.info("Selendroid needs to be built; please run ./reset.sh " +
                  "--selendroid");
      return cb(err);
    }
    logger.info("Selendroid server exists!");
    this.serverApk = selBin;
    cb(null);
  }, this));
};

Selendroid.prototype.waitForServer = function(cb) {
  var waitMs = 20000
    , intMs = 800
    , start = Date.now();

  var pingServer = _.bind(function() {
    this.proxyTo('/wd/hub/status', 'GET', null, function(err, res, body) {
      if (body === null || typeof body === "undefined" || !body.trim()) {
        if (Date.now() - start < waitMs) {
          setTimeout(pingServer, intMs);
        } else {
          cb(new Error("Waited " + (waitMs / 1000) + " secs for " +
                       "selendroid server and it never showed up"));
        }
      } else {
        logger.info("Selendroid server is alive!");
        cb(null);
      }
    });
  }, this);

  pingServer();
};

Selendroid.prototype.createSession = function(cb) {
  logger.info("Creating Selendroid session");
  var data = {desiredCapabilities: this.desiredCaps};
  var me = this;
  this.proxyTo('/wd/hub/session', 'POST', data, _.bind(function(err, res, body) {
    if (err) return cb(err);

    if (res.statusCode === 301 && body.sessionId) {
      logger.info("Successfully started selendroid session");
      this.selendroidSessionId = body.sessionId;
      cb(null, body.sessionId);
      me.adb.startApp(function(){});
    } else {
      logger.error("Selendroid create session did not work. Status was " +
                   res.statusCode + " and body was " + body);
      cb(new Error("Did not get session redirect from selendroid"));
    }
  }, this));
};

Selendroid.prototype.deleteSession = function(cb) {
  var url = '/wd/hub/session/' + this.selendroidSessionId;
  this.proxyTo(url, 'DELETE', null, _.bind(function(err, res) {
    if (err) return cb(err);
    if (res.statusCode !== 200) return cb(new Error("Status was not 200"));
    this.adb.stopApp(cb);
  }, this));
};

Selendroid.prototype.proxyTo = proxyTo;

module.exports = function(opts) {
  return new Selendroid(opts);
};

