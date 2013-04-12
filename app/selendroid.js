"use strict";

var errors = require('./errors')
  , adb = require('../uiautomator/adb')
  , _ = require('underscore')
  , request = require('./device').request
  , logger = require('../logger').get('appium')
  , status = require("./uiauto/lib/status")
  , exec = require('child_process').exec
  , fs = require('fs')
  , copyFile = require('./helpers').copyFile
  , async = require('async')
  , path = require('path')
  , UnknownError = errors.UnknownError;

var Selendroid = function(opts) {
  this.opts = opts;
  this.serverApk = null;
  this.appPackage = opts.appPackage;
  this.desiredCaps = opts.desiredCaps;
  this.onStop = function() {};
  this.adb = null;
  this.isProxy = true;
  this.proxyHost = 'localhost';
  this.proxyPort = 8080;
};

Selendroid.prototype.start = function(cb) {
  logger.info("Starting selendroid server");
  var opts = _.clone(this.opts);
  opts.port = this.proxyPort;
  opts.devicePort = 8080;
  //opts.fastReset = false;
  //opts.cleanApp = false;
  this.adb = new adb(opts);
  this.ensureServerExists(_.bind(function(err) {
    if (err) return cb(err);
    // modify desired caps
    var desiredCaps = _.clone(this.desiredCaps);
    this.adb.startSelendroid(this.serverApk, _.bind(function(err) {
      if (err) return cb(err);
      logger.info("Selendroid is launching, waiting for server");
      this.waitForServer(_.bind(function(err) {
        if (err) return cb(err);
        logger.info("Selendroid server is alive! Proxying to it");
        var data = {desiredCapabilities: desiredCaps};
        this.proxyTo('/wd/hub/session', 'POST', data, function(err, res, body) {
          if (err) return cb(err);

          if (res.statusCode === 301 && body.sessionId) {
            logger.info("Successfully started selendroid session");
            cb(null, body.sessionId);
          } else {
            cb(new Error("Did not get session redirect from selendroid"));
            console.log(res.headers);
            console.log(res.statusCode);
            console.log(body);
          }
        });
      }, this));
    }, this));
  }, this));
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
  var src = buildDir + "/target/selendroid-server-0.3.apk";
  var dest = buildDir + "/target/selendroid-" + this.appPackage + '.apk';
  var cmd = "mvn install -Dandroid.renameInstrumentationTargetPackage=" +
            this.appPackage;
  exec(cmd, {cwd: buildDir}, _.bind(function(err, stdout, stderr) {
    if (err) {
      logger.error("Unable to build selendroid server");
      console.log(stdout);
      console.log(stderr);
      return cb(err);
    }
    logger.info("Copying selendroid server to correct destination");
    copyFile(src, dest, _.bind(function(err) {
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
        cb(null);
      }
    });
  }, this);

  pingServer();
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

