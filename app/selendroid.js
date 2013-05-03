"use strict";

var errors = require('./errors')
  , adb = require('../android/adb')
  , _ = require('underscore')
  , request = require('./device').request
  , logger = require('../logger').get('appium')
  , status = require("./uiauto/lib/status")
  , exec = require('child_process').exec
  , fs = require('fs')
  , ncp = require('ncp')
  , async = require('async')
  , path = require('path')
  , UnknownError = errors.UnknownError;

var Selendroid = function(opts) {
  this.opts = opts;
  this.serverApk = null;
  this.appPackage = opts.appPackage;
  this.desiredCaps = opts.desiredCaps;
  this.onStop = function() {};
  this.selendroidSessionId = null;
  this.adb = null;
  this.isProxy = true;
  this.proxyHost = 'localhost';
  this.proxyPort = 8080;
};

Selendroid.prototype.start = function(cb) {
  logger.info("Starting selendroid server");
  var opts = _.clone(this.opts)
    , me = this;
  opts.port = this.proxyPort;
  opts.devicePort = 8080;
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

Selendroid.prototype.ensureServerExists = function(cb) {
  logger.info("Checking whether selendroid is built for package yet");
  var fileName = 'selendroid-' + this.appPackage + '.apk';
  var filePath = path.resolve(__dirname, "../selendroid/selendroid-server",
                              "target", fileName);
  fs.stat(filePath, _.bind(function(err) {
    if (err) {
      logger.info("Selendroid needs to be built");
      return this.buildServer(cb);
    }
    logger.info("Selendroid server already exists, not rebuilding");
    this.serverApk = filePath;
    cb(null);
  }, this));
};

Selendroid.prototype.buildServer = function(cb) {
  logger.info("Building selendroid server for package " + this.appPackage);
  var buildDir = path.resolve(__dirname, "../selendroid/selendroid-server");
  var src = buildDir + "/target/selendroid-server-0.4-SNAPSHOT.apk";
  var dest = buildDir + "/target/selendroid-" + this.appPackage + '.apk';
  var cmd = "mvn install -Dandroid.renameInstrumentationTargetPackage=" +
            this.appPackage;
  exec(cmd, {cwd: buildDir}, _.bind(function(err, stdout, stderr) {
    if (err) {
      logger.error("Unable to build selendroid server. Stdout was: ");
      logger.error(stdout);
      logger.error(stderr);
      return cb(err);
    }
    logger.info("Copying selendroid server to correct destination");
    ncp(src, dest, _.bind(function(err) {
      if (err) {
        logger.error("Error copying selendroid to destination");
        return cb(err);
      }
      logger.info("Selendroid server copied successfully");
      this.serverApk = dest;
      cb(null);
    }, this));
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
  var data = {desiredCapabilities: this.desiredCaps};
  this.proxyTo('/wd/hub/session', 'POST', data, _.bind(function(err, res, body) {
    if (err) return cb(err);

    if (res.statusCode === 301 && body.sessionId) {
      logger.info("Successfully started selendroid session");
      this.selendroidSessionId = body.sessionId;
      cb(null, body.sessionId);
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
    cb();
  }, this));
};

Selendroid.prototype.proxyTo = function(endpoint, method, data, cb) {
  if (endpoint[0] !== '/') {
    endpoint = '/' + endpoint;
  }
  var url = 'http://' + this.proxyHost + ':' + this.proxyPort + endpoint;
  request(url, method, data ? data : null, cb);
};

module.exports = function(opts) {
  return new Selendroid(opts);
};

