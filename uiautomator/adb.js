"use strict";

var spawn = require('child_process').spawn
  , exec = require('child_process').exec
  , path = require('path')
  , fs = require('fs')
  , net = require('net')
  , logger = require('../logger').get('appium')
  , status = require('../app/uiauto/lib/status')
  , _ = require('underscore');

var noop = function() {};

var ADB = function(opts) {
  if (!opts) {
    opts = {};
  }
  if (typeof opts.sdkRoot === "undefined") {
    opts.sdkRoot = process.env.ANDROID_HOME || '';
  }
  this.sdkRoot = opts.sdkRoot;
  this.skipInstall = opts.skipInstall || false;
  this.skipUninstall = !(opts.reset || false);
  this.port = opts.port || 4724;
  this.avdName = opts.avdName;
  this.appPackage = opts.appPackage;
  this.appActivity = opts.appActivity;
  this.apkPath = opts.apkPath;
  this.adb = "adb";
  this.adbCmd = this.adb;
  this.curDeviceId = null;
  this.socketClient = null;
  this.proc = null;
  this.onSocketReady = noop;
  this.portForwarded = false;
  this.debugMode = true;
};

ADB.prototype.checkAdbPresent = function(cb) {
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

ADB.prototype.start = function(onReady, onExit) {
  var doRun = _.bind(function() {
    this.runBootstrap(onReady, onExit);
  }, this);

  // WHEEE!!!!
  this.checkAdbPresent(_.bind(function(err) {
    if (err) {
      onReady(err);
    } else {
      this.getConnectedDevices(_.bind(function(err, devices) {
        if (devices.length === 0 || err) {
          onReady("Could not find a connected Android device.");
        } else {
          this.waitForDevice(_.bind(function(err) {
            if (err) {
              onReady(err);
            } else {
              this.pushAppium(_.bind(function(err) {
                if (err) {
                  onReady(err);
                } else {
                  this.forwardPort(_.bind(function(err) {
                    if (err) {
                      onReady(err);
                    } else if (this.appPackage) {
                      //this.uninstallApp(_.bind(function(err) {
                        //if (err) {
                          //onReady(err);
                        //} else {
                          this.installApp(_.bind(function(err) {
                            if (err) {
                              onReady(err);
                            } else {
                              this.startApp(_.bind(function(err) {
                                if (err) {
                                  onReady(err);
                                } else {
                                  doRun();
                                }
                              }, this));
                            }
                          //}, this));
                        //}
                      }, this));
                    } else {
                      doRun();
                    }
                  }, this));
                }
              }, this));
            }
          }, this));
        }
      }, this));
    }
  }, this));
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
      this.debug(devices.length + " device(s) connected");
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
    if (this.socketClient) {
      this.socketClient.end();
      this.socketClient.destroy();
      this.socketClient = null;
    }
    exitCb(code);
  }, this));


};

ADB.prototype.checkForSocketReady = function(output) {
  if (/Appium Socket Server Ready/.exec(output)) {
    this.requirePortForwarded();
    this.debug("Connecting to server on device...");
    this.socketClient = net.connect(this.port, _.bind(function() {
      this.debug("Connected!");
      this.onSocketReady(null);
    }, this));
    this.socketClient.setEncoding('utf8');
    this.socketClient.on('data', _.bind(function(data) {
      this.debug("Received command result from bootstrap");
      try {
        data = JSON.parse(data);
      } catch (e) {
        this.debug("Could not parse JSON from data: " + data);
        data = {
          status: status.codes.UnknownError.code
          , value: "Got a bad response from Android server"
        };
      }
      if (this.cmdCb) {
        var next = this.cmdCb;
        this.cmdCb = null;
        next(data);
      } else {
        this.debug("Got data when we weren't expecting it, ignoring:");
        this.debug(JSON.stringify(data));
      }
    }, this));
  }
};

ADB.prototype.sendAutomatorCommand = function(action, params, cb) {
  if (typeof params === "function") {
    cb = params;
    params = {};
  }
  var extra = {action: action, params: params};
  this.sendCommand('action', extra, cb);
};

ADB.prototype.sendCommand = function(type, extra, cb) {
  if (this.socketClient) {
    if (typeof extra === "undefined" || extra === null) {
      extra = {};
    }
    var cmd = {cmd: type};
    cmd = _.extend(cmd, extra);
    var cmdJson = JSON.stringify(cmd) + "\n";
    this.cmdCb = cb;
    this.debug("Sending command to android: " + cmdJson.trim());
    this.socketClient.write(cmdJson);
  } else {
    cb({
      status: status.codes.UnknownError.code
      , value: "Tried to send command to non-existent Android socket, " +
               "maybe it's shutting down?"
    });
  }
};

ADB.prototype.sendShutdownCommand = function(cb) {
  this.sendCommand('shutdown', null, cb);
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
  if (this.debugMode) {
    logger.info("[ADB] " + msg);
  }
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

ADB.prototype.requireApp = function() {
  if (!this.appPackage || !this.appActivity) {
    throw new Error("This method requires that appPackage and appActivity " +
                    "be sent in with options");
  }
};

ADB.prototype.requireApk = function() {
  if (!this.apkPath) {
    throw new Error("This method requires that apkPath be sent in as option");
  }
};

ADB.prototype.waitForDevice = function(cb) {
  this.requireDeviceId();
  this.debug("Waiting for device " + this.curDeviceId + " to be ready " +
             "and to respond to shell commands");
  var cmd = this.adbCmd + " wait-for-device";

  var timeoutSecs = 5;
  var movedOn = false;
  setTimeout(function() {
    if (!movedOn) {
      movedOn = true;
      cb("Device did not become ready in " + timeoutSecs + " secs; are " +
         "you sure it's powered on?");
    }
  }, timeoutSecs * 1000);

  exec(cmd, _.bind(function(err) {
    if (!movedOn) {
      if (err) {
        logger.error(err);
        movedOn = true;
        cb(err);
      } else {
        exec(this.adbCmd + " shell echo 'ready'", _.bind(function(err) {
          if (!movedOn) {
            movedOn = true;
            if (err) {
              logger.error(err);
              cb(err);
            } else {
              cb(null);
            }
          }
        }, this));
      }
    }
  }, this));
};

ADB.prototype.pushAppium = function(cb) {
  this.debug("Pushing appium bootstrap to device...");
  var binPath = path.resolve(__dirname, "bootstrap", "bin", "AppiumBootstrap.jar");
  fs.stat(binPath, _.bind(function(err) {
    if (err) {
      cb("Could not find AppiumBootstrap.jar; please run " +
         "'grunt buildAndroidBootstrap'");
    } else {
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
    }
  }, this));
};

ADB.prototype.startApp = function(cb) {
  this.requireDeviceId();
  this.requireApp();
  this.debug("Starting app " + this.appPackage + "/" + this.appActivity);
  var cmd = this.adbCmd + " shell am start -n " + this.appPackage + "/" +
            this.appPackage + "." + this.appActivity;
  this.unlockScreen(function() {
    exec(cmd, _.bind(function(err) {
      if(err) {
        logger.error(err);
        cb(err);
      } else {
        cb(null);
      }
    }, this));
  });
};

ADB.prototype.uninstallApp = function(cb) {
  var next = _.bind(function() {
    this.requireDeviceId();
    this.requireApp();
    this.debug("Uninstalling app " + this.appPackage);
    var cmd = this.adbCmd + " uninstall " + this.appPackage;
    exec(cmd, _.bind(function(err, stdout) {
      if (err) {
        logger.error(err);
        cb(err);
      } else {
        stdout = stdout.trim();
        if (stdout === "Success") {
          this.debug("App was uninstalled");
        } else {
          this.debug("App was not uninstalled, maybe it wasn't on device?");
        }
        cb(null);
      }
    }, this));
  }, this);

  if (this.skipUninstall) {
    this.debug("Not uninstalling app since server started with --reset");
    cb();
  } else {
    next();
  }
};

ADB.prototype.installApp = function(cb) {
  var next = _.bind(function() {
    this.requireDeviceId();
    this.requireApk();
    this.debug("Installing app " + this.apkPath);
    var cmd = this.adbCmd + " install -r " + this.apkPath;
    exec(cmd, _.bind(function(err) {
      if (err) {
        logger.error(err);
        cb(err);
      } else {
        cb(null);
      }
    }, this));
  }, this);

  if (this.skipInstall) {
    this.debug("Not installing app because server started with --skip-install");
    cb();
  } else {
    next();
  }
};

ADB.prototype.goToHome = function(cb) {
  this.requireDeviceId();
  this.debug("Pressing the HOME button");
  var cmd = this.adbCmd + " shell input keyevent 3";
  exec(cmd, function() {
    cb();
  });
};

ADB.prototype.unlockScreen = function(cb) {
  this.requireDeviceId();
  this.debug("Attempting to unlock screen");
  var cmd = this.adbCmd + " shell input keyevent 82";
  exec(cmd, function() {
    cb();
  });
};


module.exports = function(opts) {
  return new ADB(opts);
};
