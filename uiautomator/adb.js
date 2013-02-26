"use strict";

var spawn = require('child_process').spawn
  , exec = require('child_process').exec
  , path = require('path')
  , net = require('net')
  , logger = require('../logger').get('appium')
  , _ = require('underscore');

var noop = function() {};

var ADB = function(opts, cb) {
  if (!opts) {
    opts = {};
  }
  if (typeof opts.sdkRoot === "undefined") {
    opts.sdkRoot = process.env.ANDROID_HOME || '';
  }
  this.sdkRoot = opts.sdkRoot;
  this.port = opts.port || 4724;
  this.avdName = opts.avdName;
  this.adb = "adb";
  this.adbCmd = this.adb;
  this.curDeviceId = null;
  this.socketClient = null;
  this.proc = null;
  this.onSocketReady = noop;
  this.portForwarded = false;
  if (this.sdkRoot) {
    this.adb = path.resolve(this.sdkRoot, "platform-tools", "adb");
    this.debug("Using adb from " + this.adb);
    cb(null, this);
  } else {
    exec("which adb", _.bind(function(err, stdout) {
      if (stdout) {
        this.debug("Using adb from " + stdout);
        this.adb = stdout;
        cb(null, this);
      } else {
        cb("Could not find adb; do you have android SDK installed?", null);
      }
    }, this));
  }
};

ADB.prototype.getConnectedDevices = function(cb) {
  this.debug("Getting connected devices...");
  exec(this.adb + " devices", _.bind(function(err, stdout) {
    if (err) {
      logger.error(err);
      cb(err);
    } else {
      var output = stdout.replace("List of devices attached", "").trim();
      var devices = [];
      _.each(output.split("\n"), function(device) {
        if (device) {
          devices.push(device.split("\t"));
        }
      });
      this.debug("\t" + devices.length + " device(s) connected");
      if (devices.length) {
        this.setDeviceId(devices[0][0]);
      }
      cb(null, devices);
    }
  }, this));
};

ADB.prototype.forwardPort = function(cb) {
  this.requireDeviceId();
  var devicePort = 4724;
  this.debug("Forwarding system:" + this.port + " to device:" + devicePort);
  var arg = "tcp:" + this.port + " tcp:" + devicePort;
  exec(this.adbCmd + " forward " + arg, _.bind(function(err) {
    if (err) {
      logger.error(err);
      cb(err);
    } else {
      this.portForwarded = true;
      cb(null);
    }
  }, this));
};

ADB.prototype.runBootstrap = function(readyCb, exitCb) {
  this.requireDeviceId();
  var args = ["-s", this.curDeviceId, "shell", "uiautomator", "runtest",
      "AppiumBootstrap.jar", "-c", "io.appium.android.bootstrap.Bootstrap"];
  this.proc = spawn(this.adb, args);
  this.onSocketReady = readyCb;
  this.proc.stdout.on('data', _.bind(function(data) {
    this.outputStreamHandler(data);
  }, this));
  this.proc.stderr.on('data', _.bind(function(data) {
    this.errorStreamHandler(data);
  }, this));
  this.proc.on('exit', _.bind(function(code) {
    exitCb(code);
    if (this.socketClient) {
      this.socketClient.end();
      this.socketClient.destroy();
    }
  }, this));


};

ADB.prototype.checkForSocketReady = function(output) {
  if (/Appium Socket Server Ready/.exec(output)) {
    this.requirePortForwarded();
    this.debug("Connecting to server on device...");
    this.socketClient = net.connect(this.port, _.bind(function() {
      this.debug("Connected!");
      this.onSocketReady();
    }, this));
    this.socketClient.setEncoding('utf8');
    this.socketClient.on('data', _.bind(function(data) {
      this.debug("Received data from bootstrap");
      data = JSON.parse(data);
      this.debug(data);
    }, this));
  }
};

ADB.prototype.outputStreamHandler = function(output) {
  this.checkForSocketReady(output);
  this.handleBootstrapOutput(output);
};

ADB.prototype.handleBootstrapOutput = function(output) {
  // for now, assume all intentional logging takes place on one line
  // and that we don't get half-lines from the stream.
  // probably bad assumptions
  output = output.toString().trim();
  var lines = output.split("\n");
  var re = /^\[APPIUM-UIAUTO\] (.+)\[\/APPIUM-UIAUTO\]$/;
  var match;
  _.each(lines, function(line) {
    line = line.trim();
    if (line !== '') {
      match = re.exec(line);
      if (match) {
        logger.info("[ANDROID] " + match[1]);
      } else {
        logger.info(("[ADB STDOUT] " + line).grey);
      }
    }
  });
};

ADB.prototype.errorStreamHandler = function(output) {
  var lines = output.split("\n");
  _.each(lines, function(line) {
    logger.info(("[ADB STDERR] " + line).yellow);
  });
};

ADB.prototype.debug = function(msg) {
  logger.info("[ADB] " + msg);
};

ADB.prototype.isDeviceConnected = function(cb) {
  this.getConnectedDevices(function(err, devices) {
    if (err) {
      cb(err);
    } else {
      cb(null, devices.length > 0);
    }
  });
};

ADB.prototype.setDeviceId = function(deviceId) {
  this.curDeviceId = deviceId;
  this.adbCmd = this.adb + " -s " + deviceId;
};

ADB.prototype.requireDeviceId = function() {
  if (!this.curDeviceId) {
    throw new Error("This method requires that a device ID is set. " +
                        "Call getConnectedDevices or setDeviceId");
  }
};

ADB.prototype.requirePortForwarded = function() {
  if (!this.portForwarded) {
    throw new Error("This method requires the port be forwarded on the " +
                    "device. Make sure to call forwardPort()!");
  }
};

ADB.prototype.waitForDevice = function(cb) {
  this.requireDeviceId();
  this.debug("Waiting for device " + this.curDeviceId + " to be ready");
  var cmd = this.adb + " -s " + this.curDeviceId + " wait-for-device";
  exec(cmd, _.bind(function(err) {
    if (err) {
      logger.error(err);
      cb(err);
    } else {
      this.debug("\tready!");
      cb(null);
    }
  }, this));
};

ADB.prototype.pushAppium = function(cb) {
  this.debug("Pushing appium bootstrap to device...");
  var binPath = path.resolve(__dirname, "bootstrap", "bin", "AppiumBootstrap.jar");
  var remotePath = "/data/local/tmp";
  var cmd = this.adb + " push " + binPath + " " + remotePath;
  exec(cmd, _.bind(function(err) {
    if (err) {
      logger.error(err);
      cb(err);
    } else {
      cb(null);
    }
  }, this));
};

module.exports = function(opts, cb) {
  return new ADB(opts, cb);
};
