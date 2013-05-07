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
  , parseXmlString = require('xml2js').parseString
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
  this.getSelendroidVersion(_.bind(function(err, version) {
    if (err) return cb(err);
    var fileName = 'selendroid-server-' + version + '.apk';
    var filePath = path.resolve(__dirname, "../selendroid/selendroid-server",
                                "target", fileName);
    fs.stat(filePath, _.bind(function(err) {
      if (err) {
        logger.info("Selendroid needs to be built");
        return this.buildServer(cb, version);
      }
      logger.info("Selendroid server already exists, not rebuilding");
      this.serverApk = filePath;
      cb(null);
    }, this));
  }, this));
};

Selendroid.prototype.getSelendroidVersion = function(cb) {
  logger.info("Getting Selendroid version");
  var pomXml = path.resolve(__dirname, "..", "selendroid", "selendroid-server",
      "pom.xml");
  fs.readFile(pomXml, function(err, xmlData) {
    if (err) {
      logger.error("Could not find selendroid's pom.xml at");
      return cb(err);
    }
    parseXmlString(xmlData.toString('utf8'), function(err, res) {
      if (err) {
        logger.error("Error parsing selendroid's pom.xml");
        return cb(err);
      }
      var version = res.project.parent[0].version[0];
      if (typeof version === "string") {
        logger.info("Selendroid version is " + version);
        cb(null, version);
      } else {
        cb(new Error("Version " + version + " was not valid"));
      }
    });
  });
};

Selendroid.prototype.buildServer = function(cb, version) {
  logger.info("Building selendroid server");
  var buildDir = path.resolve(__dirname, "../selendroid/selendroid-server");
  var target = buildDir + "/target/selendroid-server-" + version + ".apk";
  var cmd = "mvn install";
  exec(cmd, {cwd: buildDir}, _.bind(function(err, stdout, stderr) {
    if (err) {
      logger.error("Unable to build selendroid server. Stdout was: ");
      logger.error(stdout);
      logger.error(stderr);
      return cb(err);
    }
    logger.info("Making sure target exists");
    fs.stat(target, _.bind(function(err) {
      if (err) {
        logger.error("Selendroid doesn't exist! Not sure what to do.");
        return cb(err);
      }
      logger.info("Selendroid server built successfully");
      this.serverApk = target;
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
  logger.info("Creating Selendroid session");
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

