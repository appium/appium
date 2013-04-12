"use strict";

var spawn = require('child_process').spawn
  , exec = require('child_process').exec
  , path = require('path')
  , fs = require('fs')
  , net = require('net')
  , logger = require('../logger').get('appium')
  , status = require('../app/uiauto/lib/status')
  , unzipFile = require('../app/helpers').unzipFile
  , testZipArchive = require('../app/helpers').testZipArchive
  , async = require('async')
  , ncp = require('ncp')
  , mkdirp = require('mkdirp')
  , _ = require('underscore');

var noop = function() {};

var ADB = function(opts, android) {
  if (!opts) {
    opts = {};
  }
  if (typeof opts.sdkRoot === "undefined") {
    opts.sdkRoot = process.env.ANDROID_HOME || '';
  }
  this.sdkRoot = opts.sdkRoot;
  this.udid = opts.udid;
  // Don't uninstall if using fast reset.
  // Uninstall if reset is set and fast reset isn't.
  this.skipUninstall = opts.fastReset || !(opts.reset || false);
  this.systemPort = opts.port || 4724;
  this.devicePort = opts.devicePort || 4724;
  this.avdName = opts.avdName;
  this.appPackage = opts.appPackage;
  this.appActivity = opts.appActivity;
  this.appWaitActivity = opts.appWaitActivity;
  this.appDeviceReadyTimeout = opts.appDeviceReadyTimeout;
  this.apkPath = opts.apkPath;
  this.adb = "adb";
  this.adbCmd = this.adb;
  this.curDeviceId = null;
  this.socketClient = null;
  this.proc = null;
  this.onSocketReady = noop;
  this.onExit = noop;
  this.alreadyExited = false;
  this.portForwarded = false;
  this.debugMode = true;
  this.fastReset = opts.fastReset;
  this.cleanApp = opts.cleanApp || this.fastReset;
  this.cleanAPK = '/tmp/' + this.appPackage + '.clean.apk';
  // This is set to true when the bootstrap jar crashes.
  this.restartBootstrap = false;
  // The android ref is used to resend the command that
  // detected the crash.
  this.android = android;
  this.cmdCb = null;
};

ADB.prototype.checkSdkBinaryPresent = function(binary, cb) {
  var binaryLoc = null;
  if (this.sdkRoot) {
    binaryLoc = path.resolve(this.sdkRoot, "platform-tools", binary);
    this.debug("Using " + binary + " from " + binaryLoc);
    cb(null, binaryLoc);
  } else {
    exec("which " + binary, _.bind(function(err, stdout) {
      if (stdout) {
        this.debug("Using " + binary + " from " + stdout);
        cb(null, stdout);
      } else {
        cb(new Error("Could not find " + binary + "; do you have android " +
                     "SDK installed?"),
           null);
      }
    }, this));
  }
};

ADB.prototype.checkAdbPresent = function(cb) {
  this.checkSdkBinaryPresent("adb", _.bind(function(err, binaryLoc) {
    if (err) return cb(err);
    this.adb = binaryLoc;
    cb(null);
  }, this));
};

ADB.prototype.retargetManifest = function(newPkg, newTarget, inFile, outFile, cb) {
  var data = fs.readFileSync(inFile, "utf8");
  var rePkg = /package="([^"]+)"/;
  var reTarget = /targetPackage="([^"]+)"/;
  var matchPkg = rePkg.exec(data);
  var matchTarget = reTarget.exec(data);

  if (newPkg && !matchPkg) {
    logger.debug("Could not find package= in manifest");
    return cb("could not find package= in manifest");
  }

  if (newTarget && !matchTarget) {
    logger.debug("Could not find targetPackage= in manifest");
    return cb("could not find targetPackage= in manifest");
  }

  if (newPkg) {
    var newPkgData = matchPkg[0].replace(matchPkg[1], newPkg);
    data = data.replace(matchPkg[0], newPkgData);
  }

  if (newTarget) {
    var newTargetData = matchTarget[0].replace(matchTarget[1], newTarget);
    data = data.replace(matchTarget[0], newTargetData);
  }

  fs.writeFileSync(outFile, data, "utf8");
  logger.debug("Created manifest");
  cb(null);
};

// Fast reset
ADB.prototype.buildFastReset = function(skipAppSign, cb) {
  // Create manifest
  var me = this;
  var targetAPK = me.apkPath;
  var cleanAPKSrc = path.resolve(__dirname, '../app/android/Clean.apk');
  var newPackage = me.appPackage + '.clean';
  var inFile = path.resolve(__dirname, '../app/android/AndroidManifest.xml.src');
  var outFile = inFile.substr(0, inFile.length - '.src'.length);

  var resignApks = function(cb) {
    // Resign clean apk and target apk
    var apks = [ me.cleanAPK ];
    if (!skipAppSign) {
      logger.debug("Signing app and clean apk.");
      apks.push(targetAPK);
    } else {
      logger.debug("Skip app sign. Sign clean apk.");
    }
    me.sign(apks, cb);
  };

  async.series([
    function(cb) { me.retargetManifest(newPackage, me.appPackage, inFile, outFile, cb); },
    function(cb) { me.checkSdkBinaryPresent("aapt", cb); },
    function(cb) { me.compileManifest(outFile, cb); },
    function(cb) { me.insertManifest(outFile, cleanAPKSrc, me.cleanAPK, cb); },
    function(cb) { resignApks(cb); }
  ], cb);
};

ADB.prototype.insertSelendroidManifest = function(serverPath, cb) {
  var me = this
    , newServerPath = me.selendroidServerPath
    , srcManifest = path.resolve(__dirname, "../selendroid/selendroid-gem",
                                 "selendroid-prebuild/AndroidManifest.xml")
    , dstDir = '/tmp/' + this.appPackage
    , dstManifest = dstDir + '/AndroidManifest.xml';

  async.series([
    function(cb) { mkdirp(dstDir, cb); },
    function(cb) { me.retargetManifest(null, me.appPackage, srcManifest,
      dstManifest, cb); },
    function(cb) { me.checkSdkBinaryPresent("aapt", cb); },
    function(cb) { me.compileManifest(dstManifest, cb); },
    function(cb) { me.insertManifest(dstManifest, serverPath, newServerPath,
      cb); }
  ], cb);
};

ADB.prototype.compileManifest = function(manifest, cb) {
  var androidHome = process.env.ANDROID_HOME
    , platforms = androidHome + '/platforms/'
    , platform = 'android-17';

  // android-17 may be called android-4.2
  if (!fs.existsSync(platforms + platform)) {
    platform = 'android-4.2';

    if (!fs.existsSync(platforms + platform)) {
      return cb(new Error("Platform doesn't exist " + platform));
    }
  }

  // Compile manifest into manifest.xml.apk
  var compileManifest = ['aapt package -M "', manifest,
                          '" -I "', platforms + platform + '/android.jar" -F "',
                          manifest, '.apk" -f'].join('');
  logger.debug(compileManifest);
  exec(compileManifest, {}, function(err, stdout, stderr) {
    if (err) {
      logger.debug(stderr);
      return cb("error compiling manifest");
    }
    logger.debug("Compiled manifest");
    cb(null);
  });
};

ADB.prototype.insertManifest = function(manifest, srcApk, dstApk, cb) {
  var extractManifest = function(cb) {
    // Extract compiled manifest from manifest.xml.apk
    unzipFile(manifest + '.apk', function(err, stderr) {
      if (err) {
        logger.debug(stderr);
        return cb(err);
      }
      cb(null);
    });
  };

  var createTmpApk = function(cb) {
    logger.debug("Writing tmp apk. " + srcApk + ' to ' + dstApk);
    ncp(srcApk, dstApk, cb);
  };

  var testDstApk = function(cb) {
    logger.debug("Testing new tmp apk.");
    testZipArchive(dstApk, cb);
  };

  var moveManifest = function(cb) {
    // Insert compiled manfiest into /tmp/appPackage.clean.apk
    // -j = keep only the file, not the dirs
    // -m = move manifest into target apk.
    var replaceCmd = 'zip -j -m "' + dstApk + '" "' + manifest + '"';
    logger.debug(replaceCmd);
    exec(replaceCmd, {}, function(err) {
      if (err) {
        return cb(err);
      }
      logger.debug("Inserted manifest.");
      cb(null);
    });
  };

  async.series([
    function(cb) { extractManifest(cb); },
    function(cb) { createTmpApk(cb); },
    function(cb) { testDstApk(cb); },
    function(cb) { moveManifest(cb); }
  ], cb);
};

// apks is an array of strings.
ADB.prototype.sign = function(apks, cb) {
  var signPath = path.resolve(__dirname, '../app/android/sign.jar');
  var resign = 'java -jar "' + signPath + '" "' + apks.join('" "') + '" --override';
  logger.debug("Resigning: " + resign);
  exec(resign, {}, function(err, stdout, stderr) {
    if (stderr.indexOf("Input is not an existing file") !== -1) {
      logger.warn("Could not resign apk(s), got non-existing file error");
      return cb(new Error("Could not sign one or more apks. Are you sure " +
                          "the file paths are correct: " +
                          JSON.stringify(apks)));
    }
    cb(err);
  });
};

// returns true when already signed, false otherwise.
ADB.prototype.checkApkCert = function(apk, cb) {
  var verifyPath = path.resolve(__dirname, '../app/android/verify.jar');
  var resign = 'java -jar "' + verifyPath + '" "' + apk + '"';
  logger.debug("Checking app cert: " + resign);
  exec(resign, {}, function(err) {
    if (err) {
      logger.debug("App not signed with debug cert.");
      return cb(false);
    }
    logger.debug("App already signed.");
    cb(true);
  });
};

ADB.prototype.checkFastReset = function(cb) {
  // NOP if fast reset is not true.
  if (!this.fastReset) {
    return cb(null);
  }

  if (!this.appPackage) return cb(new Error("appPackage must be set."));

  var me = this;
  me.checkApkCert(me.cleanAPK, function(cleanSigned){
    me.checkApkCert(me.apkPath, function(appSigned){
      // Only build & resign clean.apk if it doesn't exist or isn't signed.
      if (!fs.existsSync(me.cleanAPK) || !cleanSigned) {
        me.buildFastReset(appSigned, function(err){ if (err) return cb(err); cb(null); });
      } else {
        if (!appSigned) {
          // Resign app apk because it's not signed.
          me.sign([me.apkPath], cb);
        } else {
          // App and clean are already existing and signed.
          cb(null);
        }
      }
    });
  });
};

ADB.prototype.getDeviceWithRetry = function(cb) {
  var me = this;
  var getDevices = function(innerCb) {
    me.getConnectedDevices(function(err, devices) {
      if (devices.length === 0 || err) {
        return innerCb(new Error("Could not find a connected Android device."));
      }
      innerCb(null);
    });
  };
  getDevices(function(err) {
    if (err) {
      logger.info("Could not find devices, restarting adb server...");
      me.restartAdb(function() {
        getDevices(cb);
      });
    } else {
      cb(null);
    }
  });
};

ADB.prototype.prepareDevice = function(onReady) {
  var me = this;
  async.series([
    function(cb) { me.checkAdbPresent(cb); },
    function(cb) { me.getDeviceWithRetry(cb);},
    function(cb) { me.waitForDevice(cb); },
    function(cb) { me.checkFastReset(cb); }
  ], onReady);
};

ADB.prototype.startAppium = function(onReady, onExit) {
  var me = this
    , doRun = function(err) {
        if (err) return onReady(err);
        me.runBootstrap(onReady, onExit);
      };
  this.onExit = onExit;

  logger.debug("Using fast reset? " + this.fastReset);

  async.series([
    function(cb) { me.prepareDevice(cb); },
    function(cb) { me.installApp(cb); },
    function(cb) { me.forwardPort(cb); },
    function(cb) { me.pushAppium(cb); },
    function(cb) { me.startApp(cb); }
  ], doRun);
};

ADB.prototype.startSelendroid = function(serverPath, onReady) {
  var me = this
    , modServerExists = false;
  this.selendroidServerPath = serverPath.replace(/\.apk$/, ".mod.apk");

  var checkModServerExists = function(cb) {
    fs.stat(me.selendroidServerPath, function(err) {
      modServerExists = !err;
      cb();
    });
  };

  var conditionalUninstallSelendroid = function(cb) {
    if (!modServerExists) {
      // assume we're going to rebuild selendroid and therefore
      // need to uninstall it if it's already on device
      logger.info("Rebuilt selendroid apk does not exist, uninstalling " +
                  "any instances of it on device to make way for new one");
      me.uninstallApk('org.openqa.selendroid', cb);
    } else {
      logger.info("Rebuilt selendroid apk exists, doing nothing");
      cb();
    }
  };

  var conditionalInsertManifest = function(cb) {
    if (!modServerExists) {
      logger.info("Rebuilt selendroid server does not exist, inserting " +
                  "modified manifest");
      me.insertSelendroidManifest(serverPath, cb);
    } else {
      logger.info("Rebuilt selendroid server already exists, no need to " +
                  "rebuild it with a new manifest");
      cb();
    }
  };

  var conditionalInstallSelendroid = function(cb) {
    me.checkAppInstallStatus('org.openqa.selendroid', function(e, installed) {
      if (!installed) {
        logger.info("Rebuilt selendroid is not installed, installing it");
        me.installApk(me.selendroidServerPath, cb);
      } else {
        logger.info("Rebuilt selendroid is already installed");
        cb();
      }
    });
  };

  async.series([
    function(cb) { me.prepareDevice(cb); },
    function(cb) { checkModServerExists(cb); },
    function(cb) { conditionalUninstallSelendroid(cb); },
    function(cb) { conditionalInsertManifest(cb); },
    function(cb) { me.checkSelendroidCerts(me.selendroidServerPath, cb); },
    function(cb) { conditionalInstallSelendroid(cb); },
    function(cb) { me.installApp(cb); },
    function(cb) { me.forwardPort(cb); },
    function(cb) { me.pushSelendroid(cb); },
    function(cb) { logger.info("Selendroid server is launching"); cb(); }
  ], onReady);
};

ADB.prototype.pushSelendroid = function(cb) {
  var cmd = "adb shell am instrument -e main_activity '" + this.appPackage +
            "." + this.appActivity + "' org.openqa.selendroid/" +
            "org.openqa.selendroid.ServerInstrumentation";
  logger.info("Starting instrumentation process for selendroid with cmd: " +
              cmd);
  exec(cmd, function(err, stdout) {
    if (stdout.indexOf("Exception") !== -1) {
      logger.error(stdout);
      var msg = stdout.split("\n")[0] || "Unknown exception starting selendroid";
      return cb(new Error(msg));
    }
    cb();
  });
};

ADB.prototype.checkSelendroidCerts = function(serverPath, cb) {
  var me = this
    , alreadyReturned = false
    , checks = 0;

  var onDoneSigning = function() {
    checks++;
    if (checks === 2 && !alreadyReturned) {
      cb();
    }
  };

  // these run in parallel
  var apks = [serverPath, this.apkPath];
  _.each(apks, function(apk) {
    logger.info("Checking signed status of " + apk);
    me.checkApkCert(apk, function(isSigned) {
      if (isSigned) return onDoneSigning();
      me.sign([apk], function(err) {
        if (err && !alreadyReturned) {
          alreadyReturned = true;
          return cb(err);
        }
        onDoneSigning();
      });
    });
  });
};

ADB.prototype.getConnectedDevices = function(cb) {
  this.debug("Getting connected devices...");
  exec(this.adb + " devices", _.bind(function(err, stdout) {
    if (err) {
      logger.error(err);
      cb(err);
    } else {
      var devices = [];
      _.each(stdout.split("\n"), function(line) {
        if (line.trim() !== "" && line.indexOf("List of devices") === -1 && line.indexOf("* daemon") === -1) {
          devices.push(line.split("\t"));
        }
      });
      this.debug(devices.length + " device(s) connected");
      if (devices.length) {
        this.setDeviceId(this.udid || devices[0][0]);
      }
      cb(null, devices);
    }
  }, this));
};

ADB.prototype.forwardPort = function(cb) {
  this.requireDeviceId();
  this.debug("Forwarding system:" + this.systemPort + " to device:" +
             this.devicePort);
  var arg = "tcp:" + this.systemPort + " tcp:" + this.devicePort;
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

  var me = this;
  this.proc.on('exit', _.bind(function(code) {
    if (this.socketClient) {
      this.socketClient.end();
      this.socketClient.destroy();
      this.socketClient = null;
    }

    if (this.restartBootstrap === true) {
      // The bootstrap jar has crashed so it must be restarted.
      this.restartBootstrap = false;
      me.runBootstrap(function(){
        readyCb(function(){
          // Resend last command because the client is still waiting for the
          // response.
          me.android.push(null, true);
        }); }, exitCb);
      return;
    }

    if (!this.alreadyExited) {
      this.alreadyExited = true;
      exitCb(code);
    }
  }, this));


};

ADB.prototype.checkForSocketReady = function(output) {
  if (/Appium Socket Server Ready/.exec(output)) {
    this.requirePortForwarded();
    this.debug("Connecting to server on device...");
    this.socketClient = net.connect(this.systemPort, _.bind(function() {
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
  setTimeout(_.bind(function() {
    if (!this.alreadyExited) {
      logger.warn("Android did not shut down fast enough, calling it gone");
      this.alreadyExited = true;
      this.onExit(1);
    }
  }, this), 7000);
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
  var me = this;
  _.each(lines, function(line) {
    line = line.trim();
    if (line !== '') {
      match = re.exec(line);
      if (match) {
        logger.info("[ANDROID] " + match[1]);
      } else {
        // The dump command will always disconnect UiAutomation.
        // Detect the crash then restart UiAutomation.
        if (line.indexOf("UiAutomationService not connected") !== -1) {
          me.restartBootstrap = true;
        }
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
  var doWait = _.bind(function(innerCb) {
    this.debug("Waiting for device " + this.curDeviceId + " to be ready " +
               "and to respond to shell commands (timeout = " +
               this.appDeviceReadyTimeout + ")");
    var movedOn = false
      , cmd = this.adbCmd + " wait-for-device"
      , timeoutSecs = parseInt(this.appDeviceReadyTimeout, 10);

    setTimeout(_.bind(function() {
      if (!movedOn) {
        movedOn = true;
        innerCb("Device did not become ready in " + timeoutSecs + " secs; " +
                "are you sure it's powered on?");
      }
    }, this), timeoutSecs * 1000);

    exec(cmd, _.bind(function(err) {
      if (!movedOn) {
        if (err) {
          logger.error("Error running wait-for-device");
          movedOn = true;
          innerCb(err);
        } else {
          exec(this.adbCmd + " shell echo 'ready'", _.bind(function(err) {
            if (!movedOn) {
              movedOn = true;
              if (err) {
                logger.error("Error running shell echo: " + err);
                innerCb(err);
              } else {
                innerCb(null);
              }
            }
          }, this));
        }
      }
    }, this));
  }, this);

  doWait(_.bind(function(err) {
    if (err) {
      this.restartAdb(_.bind(function() {
        this.getConnectedDevices(function() {
          doWait(cb);
        });
      }, this));
    } else {
      cb(null);
    }
  }, this));
};

ADB.prototype.restartAdb = function(cb) {
  logger.info("Killing ADB server so it will come back online");
  var cmd = this.adb + " kill-server";
  exec(cmd, function(err) {
    if (err) {
      logger.error("Error killing ADB server, going to see if it's online " +
                   "anyway");
    }
    cb();
  });
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
      var cmd = this.adbCmd + " push " + binPath + " " + remotePath;
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
  var activityString = this.appActivity;
  var hasNoPrefix = true;
  var rootPrefixes = ['com', 'net', 'org', 'io'];
  _.each(rootPrefixes, function(prefix) {
    if (activityString.indexOf(prefix + ".") !== -1) {
      hasNoPrefix = false;
    }
  });
  if (hasNoPrefix) {
    activityString = this.appPackage + "." + activityString;
  }
  var cmd = this.adbCmd + " shell am start -n " + this.appPackage + "/" +
            activityString;
  this.debug("Starting app " + this.appPackage + "/" + activityString);
  this.unlockScreen(_.bind(function() {
    exec(cmd, _.bind(function(err) {
      if(err) {
        logger.error(err);
        cb(err);
      } else {
        this.waitForActivity(cb);
      }
    }, this));
  }, this));
};

ADB.prototype.getFocusedPackageAndActivity = function(cb) {
  this.requireDeviceId();
  var cmd = this.adbCmd + " shell dumpsys window windows"
    , searchRe = new RegExp(/mFocusedApp.+ ([a-zA-Z0-9\.]+)\/\.?([^\}]+)\}/);

  exec(cmd, _.bind(function(err, stdout) {
    if (err) {
      logger.error(err);
      cb(err);
    } else {
      var foundMatch = false;
      _.each(stdout.split("\n"), function(line) {
        var match = searchRe.exec(line);
        if (match) {
          foundMatch = match;
        }
      });
      if (foundMatch) {
        cb(null, foundMatch[1], foundMatch[2]);
      } else {
        cb(new Error("Could not parse activity from dumpsys"));
      }
    }
  }, this));
};

ADB.prototype.waitForActivity = function(cb) {
  this.requireApp();
  logger.info("Waiting for app's activity to become focused");
  var waitMs = 20000
    , intMs = 750
    , endAt = Date.now() + waitMs
    , targetActivity = this.appWaitActivity || this.appActivity;

  var getFocusedApp = _.bind(function() {
    this.getFocusedPackageAndActivity(_.bind(function(err, foundPackage,
          foundActivity) {
      if (foundPackage === this.appPackage && foundActivity === targetActivity) {
        cb(null);
      } else if (Date.now() < endAt) {
        if (err) logger.info(err);
        setTimeout(getFocusedApp, intMs);
      } else {
        var msg = "App never showed up as active. appActivity: " +
                  foundActivity + " != " + targetActivity;
        logger.error(msg);
        cb(new Error(msg));
      }

    }, this));
  }, this);
  getFocusedApp();
};

ADB.prototype.uninstallApk = function(pkg, cb) {
  var cmd = this.adbCmd + " uninstall " + pkg;
  exec(cmd, function(err, stdout) {
    if (err) {
      logger.error(err);
      cb(err);
    } else {
      stdout = stdout.trim();
      if (stdout === "Success") {
        logger.debug("App was uninstalled");
      } else {
        logger.debug("App was not uninstalled, maybe it wasn't on device?");
      }
      cb(null);
    }
  });
};

ADB.prototype.installApk = function(apk, cb) {
  var cmd = this.adbCmd + ' install -r "' + apk + '"';
  this.debug(cmd);
  exec(cmd,function(err, stdout) {
    if (err) {
      logger.error(err);
      cb(err);
    } else {
      // Useful for debugging.
      logger.debug(stdout);
      cb(null);
    }
  });
};

ADB.prototype.uninstallApp = function(cb) {
  var me = this;
  var next = function() {
    me.requireDeviceId();
    me.requireApp();
    me.debug("Uninstalling app " + me.appPackage);

    me.uninstallApk(me.appPackage, function(err) {
      if (me.fastReset) {
        var cleanPkg = me.appPackage + '.clean';
        me.debug("Uninstalling app " + cleanPkg);
        me.uninstallApk(cleanPkg, function(err) {
          if (err) return cb(err);
          cb(null);
        });
      } else {
        if (err) return cb(err);
        cb(null);
      }
    });
  };

  if (me.skipUninstall) {
    me.debug("Not uninstalling app since server started with --reset");
    cb();
  } else {
    next();
  }
};

ADB.prototype.runFastReset = function(cb) {
  // list instruments with: adb shell pm list instrumentation
  // targetPackage + '.clean' / clean.apk.Clear
  var me = this;
  var clearCmd = me.adbCmd + ' shell am instrument ' + me.appPackage + '.clean/clean.apk.Clean';
  logger.debug("Clear command: " + clearCmd);
  exec(clearCmd, {}, function(err, stdout, stderr) {
    if (err) {
      logger.warn(stderr);
      cb(err);
    } else {
      cb(null);
    }
  });
};

ADB.prototype.checkAppInstallStatus = function(pkg, cb) {
  var installed = false
    , cleanInstalled = false;
  this.requireDeviceId();

  logger.debug("Getting install/clean status for " + pkg);
  var listPkgCmd = this.adbCmd + " shell pm list packages -3 " + pkg;
  exec(listPkgCmd, function(err, stdout) {
    var apkInstalledRgx = new RegExp('^package:' +
        pkg.replace(/([^a-zA-Z])/g, "\\$1") + '$', 'm');
    installed = !!apkInstalledRgx.test(stdout);
    var cleanInstalledRgx = new RegExp('^package:' +
        (pkg + '.clean').replace(/([^a-zA-Z])/g, "\\$1") + '$', 'm');
    cleanInstalled = !!cleanInstalledRgx.test(stdout);
    cb(null, installed, cleanInstalled);
  });
};

ADB.prototype.installApp = function(cb) {
  var me = this
    , installApp = false
    , installClean = false;
  me.requireDeviceId();
  me.requireApk();

  var determineInstallAndCleanStatus = function(cb) {
    me.checkAppInstallStatus(me.appPackage, function(err, installed, cleaned) {
      installApp = !installed;
      installClean = !cleaned;
      cb();
    });
  };

  var doInstall = function(cb) {
    if (installApp) {
      me.debug("Installing app apk");
      me.installApk(me.apkPath, cb);
    } else { cb(null); }
  };

  var doClean = function(cb) {
    if (installClean && me.cleanApp) {
      me.debug("Installing clean apk");
      me.installApk(me.cleanAPK, cb);
    } else { cb(null); }
  };

  var doFastReset = function(cb) {
    // App is already installed so reset it.
    if (!installApp && me.fastReset) {
      me.runFastReset(cb);
    } else { cb(null); }
  };

  async.series([
    function(cb) { determineInstallAndCleanStatus(cb); },
    function(cb) { doInstall(cb); },
    function(cb) { doClean(cb); },
    function(cb) { doFastReset(cb); }
  ], cb);
};

ADB.prototype.back = function(cb) {
  this.requireDeviceId();
  this.debug("Pressing the BACK button");
  var cmd = this.adbCmd + " shell input keyevent 4";
  exec(cmd, function() {
    cb();
  });
};

ADB.prototype.goToHome = function(cb) {
  this.requireDeviceId();
  this.debug("Pressing the HOME button");
  var cmd = this.adbCmd + " shell input keyevent 3";
  exec(cmd, function() {
    cb();
  });
};

ADB.prototype.keyevent = function(keycode, cb) {
  this.requireDeviceId();
  var code = parseInt(keycode, 10);
  // keycode must be an int.
  var cmd = this.adbCmd + ' shell input keyevent ' + code;
  this.debug("Sending keyevent " + code);
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


module.exports = function(opts, android) {
  return new ADB(opts, android);
};
