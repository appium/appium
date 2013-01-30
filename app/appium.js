// Appium webserver controller methods
// https://github.com/hugs/appium/blob/master/appium/appium.py
"use strict";
var routing = require('./routing')
  , logger = require('../logger').get('appium')
  , setLogFile = require('../logger').setLogFile
  , helpers = require('./helpers')
  , downloadFile = helpers.downloadFile
  , unzipApp = helpers.unzipApp
  , UUID = require('uuid-js')
  , _ = require('underscore')
  , ios = require('./ios');

var Appium = function(args) {
  this.args = args;
  if (!this.args.verbose) {
    logger.transports.console.level = 'warn';
  }
  if (this.args.log) {
    setLogFile(logger, this.args.log);
  }
  this.rest = null;
  this.devices = {};
  this.active = null;
  this.device = null;
  this.sessionId = null;
  this.desiredCapabilities = {};
  this.sessions = [];
  this.counter = -1;
  this.progress = -1;
  this.tempFiles = [];
  this.origApp = null;
};

Appium.prototype.attachTo = function(rest, cb) {
  this.rest = rest;

  // Import the routing rules
  routing(this);

  if (cb) {
    cb();
  }
};

Appium.prototype.preLaunch = function(cb) {
  logger.info("Pre-launching app");
  if (!this.args.app) {
    logger.error("Cannot pre-launch app if it isn't passed in via --app");
    process.exit();
  } else {
    var me = this;
    this.start({}, function(err, device) {
      me.stop(function(err, res) {
        cb(me);
      });
    });
  }
};

Appium.prototype.start = function(desiredCaps, cb) {
  this.origApp = this.args.app;
  this.configure(desiredCaps, _.bind(function(err) {
    this.desiredCapabilities = desiredCaps;
    if (err) {
      cb(err, null);
    } else {
      this.sessions[++this.counter] = { sessionId: '', callback: cb };
      this.invoke();
    }
  }, this));
};

Appium.prototype.configure = function(desiredCaps, cb) {
  var hasAppInCaps = (typeof desiredCaps !== "undefined" &&
                      typeof desiredCaps.app !== "undefined" &&
                      desiredCaps.app);
  if (hasAppInCaps) {
    if (desiredCaps.app[0] === "/") {
      this.args.app = desiredCaps.app;
      logger.info("Using local app from desiredCaps: " + desiredCaps.app);
      cb(null);
    } else if (desiredCaps.app.substring(0, 4) === "http") {
      var appUrl = desiredCaps.app;
      if (appUrl.substring(appUrl.length - 4) === ".zip") {
        try {
          this.downloadAndUnzipApp(appUrl, _.bind(function(zipErr, appPath) {
            if (zipErr) {
              cb(zipErr);
            } else {
              this.args.app = appPath;
              logger.info("Using extracted app: " + this.args.app);
              cb(null);
            }
          }, this));
          logger.info("Using downloadable app from desiredCaps: " + appUrl);
        } catch (e) {
          var err = e.toString();
          logger.error("Failed downloading app from appUrl " + appUrl);
          cb(err);
        }
      } else {
        cb("App URL (" + appUrl + ") didn't seem to end in .zip");
      }
    } else if (!this.args.app) {
      cb("Bad app passed in through desiredCaps: " + desiredCaps.app +
         ". Apps need to be absolute local path or URL to zip file");
    } else {
      logger.warn("Got bad app through desiredCaps: " + desiredCaps.app);
      logger.warn("Sticking with default app: " + this.args.app);
      this.desiredCapabilities.app = this.args.app;
      cb(null);
    }
  } else if (!this.args.app) {
    cb("No app set; either start appium with --app or pass in an 'app' " +
       "value in desired capabilities");
  } else {
    logger.info("Using app from command line: " + this.args.app);
    cb(null);
  }
};

Appium.prototype.downloadAndUnzipApp = function(appUrl, cb) {
  var me = this;
  downloadFile(appUrl, function(zipPath) {
    me.tempFiles.push(zipPath);
    unzipApp(zipPath, function(err, appPath) {
      if (err) {
        cb(err, null);
      } else {
        me.tempFiles.push(appPath);
        cb(null, appPath);
      }
    });
  });
};

Appium.prototype.invoke = function() {
  var me = this;

  if (this.progress >= this.counter) {
    return;
  }

  if (this.sessionId === null) {
    this.sessionId = UUID.create().hex;
    logger.info('Creating new appium session ' + this.sessionId);

    // in future all the blackberries go here.
    this.active = 'iOS';
    if (typeof this.devices[this.active] === 'undefined') {
      this.devices[this.active] = ios(this.rest, this.args.app, this.args.udid, this.args.verbose, this.args.remove, this.args.logFile);
    }
    this.device = this.devices[this.active];

    this.device.start(function(err) {
      me.progress++;
      me.sessions[me.progress].sessionId = me.sessionId;
      me.sessions[me.progress].callback(err, me.device);
    }, _.bind(me.onDeviceDie, me));
  }
};

Appium.prototype.onDeviceDie = function(code, cb) {
  var dyingSession = this.sessionId;
  this.sessionId = null;
  // reset app to whatever it was before this session so we don't accidentally
  // reuse a bad app
  this.args.app = this.origApp;
  if (code !== null) {
    this.devices = {};
    this.device = null;
  }
  if (cb) {
    if (this.active !== null) {
      this.active = null;
      this.invoke();
    }
    cb(null, {status: 0, value: null, sessionId: dyingSession});
  }
};

Appium.prototype.stop = function(cb) {
  if (this.sessionId === null || this.device === null) {
    logger.info("Trying to stop appium but there's no session, doing nothing");
    return cb();
  }

  var me = this;

  logger.info('Shutting down appium session...');
  this.device.stop(function(code) {
    me.onDeviceDie(code, cb);
  });
};

module.exports = function(args) {
  return new Appium(args);
};
