"use strict";


var spawn = require('win-spawn')
  , exec = require('child_process').exec
  , path = require('path')
  , fs = require('fs')
  , net = require('net')
  , logger = require('../../server/logger.js').get('appium')
  , async = require('async')
  , ncp = require('ncp')
  , _ = require('underscore')
  , helpers = require('../../helpers.js')
  , unzipFile = helpers.unzipFile
  , testZipArchive = helpers.testZipArchive
  , AdmZip = require('adm-zip')
  , getTempPath = helpers.getTempPath
  , rimraf = require('rimraf')
  , Logcat = require('./logcat.js')
  , isWindows = helpers.isWindows()
  , helperJarPath = path.resolve(__dirname, 'helpers');


var ADB = function(opts) {
  if (!opts) {
    opts = {};
  }
  if (typeof opts.sdkRoot === "undefined") {
    opts.sdkRoot = process.env.ANDROID_HOME || '';
  }
  this.compressXml = opts.compressXml;
  this.sdkRoot = opts.sdkRoot;
  this.udid = opts.udid;
  this.appDeviceReadyTimeout = opts.appDeviceReadyTimeout;
  this.useKeystore = opts.useKeystore;
  this.keystorePath = opts.keystorePath;
  this.keystorePassword = opts.keystorePassword;
  this.keyAlias = opts.keyAlias;
  this.keyPassword = opts.keyPassword;
  this.adb = "adb";
  this.adbCmd = this.adb;
  this.curDeviceId = null;
  this.emulatorPort = null;
  this.debugMode = true;
  this.logcat = null;
  this.binaries = {};
};

ADB.prototype.debug = function(msg) {
  if (this.debugMode) {
    logger.info("[ADB] " + msg);
  }
};

ADB.prototype.checkSdkBinaryPresent = function(binary, cb) {
  logger.info("Checking whether " + binary + " is present");
  var binaryLoc = null;
  var binaryName = binary;
  if (isWindows) {
    if (binaryName === "android") {
      binaryName += ".bat";
    } else {
      if (binaryName.indexOf(".exe", binaryName.length - 4) === -1) {
        binaryName += ".exe";
      }
    }
  }
  if (this.sdkRoot) {
    var binaryLocs = [ path.resolve(this.sdkRoot, "platform-tools", binaryName)
        , path.resolve(this.sdkRoot, "tools", binaryName)
        , path.resolve(this.sdkRoot, "build-tools", "17.0.0", binaryName)
        , path.resolve(this.sdkRoot, "build-tools", "android-4.2.2", binaryName)
        , path.resolve(this.sdkRoot, "build-tools", "18.0.1", binaryName)
        , path.resolve(this.sdkRoot, "build-tools", "android-4.3", binaryName)];
    _.each(binaryLocs, function(loc) {
      if (fs.existsSync(loc)) binaryLoc = loc;
    });

    if (binaryLoc === null) {
      cb(new Error("Could not find " + binary + " in tools, platform-tools, " +
                   "or build-tools under \"" + this.sdkRoot + "\"; " +
                   "do you have android SDK installed into this location?"));
      return;
    }
    this.debug("Using " + binary + " from " + binaryLoc);
    binaryLoc = '"' + binaryLoc.trim() + '"';
    this.binaries[binary] = binaryLoc;
    cb(null, binaryLoc);
  } else {
    exec("which " + binary, { maxBuffer: 524288 }, function(err, stdout) {
      if (stdout) {
        this.debug("Using " + binary + " from " + stdout);
        cb(null, stdout);
      } else {
        cb(new Error("Could not find " + binary + "; do you have the Android " +
                     "SDK installed and the tools + platform-tools folders " +
                     "added to your PATH?"));
      }
    }.bind(this));
  }
};

ADB.prototype.checkAdbPresent = function(cb) {
  this.checkSdkBinaryPresent("adb", function(err, binaryLoc) {
    if (err) return cb(err);
    if (this.adbCmd === this.adb) {
      // if adbCmd is the same as default adb, update it too
      this.adbCmd = binaryLoc.trim();
    }
    this.adb = binaryLoc.trim();
    cb(null);
  }.bind(this));
};

ADB.prototype.exec = function(cmd, cb) {
  if (!cmd) {
    return cb(new Error("You need to pass in a command to exec()"));
  }
  cmd = this.adbCmd + ' ' + cmd;
  logger.debug("executing: " + cmd);
  exec(cmd, {maxBuffer: 524288}, function(err, stdout, stderr) {
    if (err) logger.warn(err);
    cb(err, stdout, stderr);
  });
};

ADB.prototype.shell = function(cmd, cb) {
  var execCmd = 'shell ' + cmd;
  this.exec(execCmd, cb);
};

ADB.prototype.spawn = function(args) {
  args.unshift(this.curDeviceId);
  args.unshift('-s');
  var adbCmd = this.adb.substr(1, this.adb.length - 2);
  logger.debug("spawning: " + adbCmd + " " + args.join(" "));
  return spawn(adbCmd, args);
};

ADB.prototype.compileManifest = function(manifest, manifestPackage,
    targetPackage, cb) {
  logger.info("Compiling manifest " + manifest);

  var platform = helpers.getAndroidPlatform();
  if (!platform || !platform[1]) {
    return cb(new Error("Required platform doesn't exist (API level >= 17)"));
  }

  // Compile manifest into manifest.xml.apk
  var compileManifest = [this.binaries.aapt + ' package -M "', manifest + '"',
                         ' --rename-manifest-package "',
                         manifestPackage + '"',
                         ' --rename-instrumentation-target-package "',
                         targetPackage + '"', ' -I "',
                         path.resolve(platform[1], 'android.jar') +'" -F "',
                         manifest, '.apk" -f'].join('');
  logger.debug(compileManifest);
  exec(compileManifest, { maxBuffer: 524288 }, function(err, stdout, stderr) {
    if (err) {
      logger.debug(stderr);
      return cb("error compiling manifest");
    }
    logger.debug("Compiled manifest");
    cb();
  });
};

ADB.prototype.insertManifest = function(manifest, srcApk, dstApk, cb) {
  logger.info("Inserting manifest, src: " + srcApk + ", dst: " + dstApk);
  var extractManifest = function(cb) {
    logger.debug("Extracting manifest");
    // Extract compiled manifest from manifest.xml.apk
    unzipFile(manifest + '.apk', function(err, stderr) {
      if (err) {
        logger.info("Error unzipping manifest apk, here's stderr:");
        logger.debug(stderr);
        return cb(err);
      }
      cb();
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
    if (isWindows) {
      var java = path.resolve(process.env.JAVA_HOME, 'bin', 'java');
      java = isWindows ? '"' + java + '.exe"' : '"' + java + '"';
      var moveManifestCmd = '"' + path.resolve(helperJarPath,
          'move_manifest.jar') + '"';
      moveManifestCmd = [java, '-jar', moveManifestCmd,
        '"' + dstApk + '"',
        '"' + manifest + '"'].join(' ');

      logger.debug("Moving manifest with: " + moveManifestCmd);
      exec(moveManifestCmd, { maxBuffer: 524288 }, function(err) {
        if (err) {
          logger.info("Got error moving manifest: " + err);
          return cb(err);
        }
        logger.debug("Inserted manifest.");
        cb(null);
      });
    } else {
      // Insert compiled manifest into /tmp/appPackage.clean.apk
      // -j = keep only the file, not the dirs
      // -m = move manifest into target apk.
      var replaceCmd = 'zip -j -m "' + dstApk + '" "' + manifest + '"';
      logger.debug("Moving manifest with: " + replaceCmd);
      exec(replaceCmd, { maxBuffer: 524288 }, function(err) {
        if (err) {
          logger.info("Got error moving manifest: " + err);
          return cb(err);
        }
        logger.debug("Inserted manifest.");
        cb();
      });
    }
  };

  async.series([
    function(cb) { extractManifest(cb); },
    function(cb) { createTmpApk(cb); },
    function(cb) { testDstApk(cb); },
    function(cb) { moveManifest(cb); }
  ], cb);
};

ADB.prototype.signWithDefaultCert = function(apks, cb) {
  var signPath = path.resolve(helperJarPath, 'sign.jar');
  var resign = 'java -jar "' + signPath + '" "' + apks.join('" "') +
    '" --override';
  logger.debug("Resigning apks with: " + resign);
  exec(resign, { maxBuffer: 524288 }, function(err, stdout, stderr) {
    if (stderr.indexOf("Input is not an existing file") !== -1) {
      logger.warn("Could not resign apk(s), got non-existing file error");
      return cb(new Error("Could not sign one or more apks. Are you sure " +
                          "the file paths are correct: " +
                          JSON.stringify(apks)));
    }
    cb(err);
  });
};

ADB.prototype.signWithCustomCert = function(apk, cb) {
  var jarsigner = path.resolve(process.env.JAVA_HOME, 'bin', 'jarsigner');
  jarsigner = isWindows ? '"' + jarsigner + '.exe"' : '"' + jarsigner + '"';
  var java = path.resolve(process.env.JAVA_HOME, 'bin', 'java');
  java = isWindows ? '"' + java + '.exe"' : '"' + java + '"';
  var unsign = '"' + path.resolve(helperJarPath, 'unsign.jar') + '"';
  unsign = [java, '-jar', unsign, '"' + apk + '"'].join(' ');

  if (!fs.existsSync(this.keystorePath)) {
    return cb(new Error("Keystore doesn't exist. " + this.keystorePath));
  }

  var sign = [jarsigner, '"' + apk + '"',
      '-sigalg MD5withRSA',
      '-digestalg SHA1',
      '-keystore "' + this.keystorePath + '"',
      '-storepass "' + this.keystorePassword + '"',
      '-keypass "' + this.keyPassword + '"',
      '"' + this.keyAlias + '"'].join(' ');
  logger.debug("Unsigning apk with: " + unsign);
  exec(unsign, { maxBuffer: 524288 }, function(err, stdout, stderr) {
    if (err || stderr) {
      logger.warn(stderr);
      return cb(new Error("Could not unsign apk. Are you sure " +
                          "the file path is correct: " +
                          JSON.stringify(apk)));
    }
    logger.debug("Signing apk with: " + sign);
    exec(sign, { maxBuffer: 524288 }, function(err, stdout, stderr) {
      if (err || stderr) {
        logger.warn(stderr);
        return cb(new Error("Could not sign apk. Are you sure " +
                            "the file path is correct: " +
                            JSON.stringify(apk)));
      }
      cb(err);
    });
  });
};

ADB.prototype.sign = function(apks, cb) {
  if (this.useKeystore) {
    async.each(apks, this.signWithCustomCert.bind(this), function(err) {
      cb(err);
    });
  } else {
    this.signWithDefaultCert(apks, cb);
  }
};

// returns true when already signed, false otherwise.
ADB.prototype.checkApkCert = function(apk, pkg, cb) {
  if (!fs.existsSync(apk)) {
   logger.debug("APK doesn't exist. " + apk);
   return cb(null, false);
  }

  if (this.useKeystore) {
    return this.checkCustomApkCert(apk, pkg, cb);
  }

  var verifyPath = path.resolve(helperJarPath, 'verify.jar');
  var resign = 'java -jar "' + verifyPath + '" "' + apk + '"';
  logger.debug("Checking app cert for " + apk + ": " + resign);
  exec(resign, { maxBuffer: 524288 }, function(err) {
    if (err) {
      logger.debug("App not signed with debug cert.");
      return cb(null, false);
    }
    logger.debug("App already signed.");
    cb(null, true);
  });
};

ADB.prototype.checkCustomApkCert = function(apk, pkg, cb) {
  var h = "a-fA-F0-9";
  var md5Str = ['.*MD5.*((?:[', h, ']{2}:){15}[', h, ']{2})'].join('');
  var md5 = new RegExp(md5Str, 'mi');
  var keytool = path.resolve(process.env.JAVA_HOME, 'bin', 'keytool');
  keytool = isWindows ? '"' + keytool + '.exe"' : '"' + keytool + '"';

  this.getKeystoreMd5(keytool, md5, function(err, keystoreHash) {
    if (err) return cb(err);
    this.checkApkKeystoreMatch(keytool, md5, keystoreHash, apk, pkg, cb);
  }.bind(this));
};

ADB.prototype.getKeystoreMd5 = function(keytool, md5re, cb) {
  var keystoreHash;
  var keystore = [keytool, '-v', '-list',
      '-alias "' + this.keyAlias + '"',
      '-keystore "' + this.keystorePath + '"',
      '-storepass "' + this.keystorePassword + '"'].join(' ');
  logger.debug("Printing keystore md5: " + keystore);
  exec(keystore, { maxBuffer: 524288 }, function(err, stdout) {
    if (err) return cb(err);
     keystoreHash = md5re.exec(stdout);
     keystoreHash = keystoreHash ? keystoreHash[1] : null;
     logger.debug('Keystore MD5: ' + keystoreHash);
     cb(null, keystoreHash);
  });
};

ADB.prototype.checkApkKeystoreMatch = function(keytool, md5re, keystoreHash,
    pkg, apk, cb) {
  var entryHash = null;
  var zip = new AdmZip(apk);
  var rsa = /^META-INF\/.*\.[rR][sS][aA]$/;
  var entries = zip.getEntries();

  var next = function() {
    var entry = entries.pop(); // meta-inf tends to be at the end
    if (!entry) return cb(null, false); // no more entries
    entry = entry.entryName;
    if (!rsa.test(entry)) return next();
    logger.debug("Entry: " + entry);
    var entryPath = path.join(getTempPath(), pkg, 'cert');
    logger.debug("entryPath: " + entryPath);
    var entryFile = path.join(entryPath, entry);
    logger.debug("entryFile: " + entryFile);
    // ensure /tmp/pkg/cert/ doesn't exist or extract will fail.
    rimraf.sync(entryPath);
    // META-INF/CERT.RSA
    zip.extractEntryTo(entry, entryPath, true); // overwrite = true
    logger.debug("extracted!");
    // check for match
    var md5Entry = [keytool, '-v', '-printcert', '-file', entryFile].join(' ');
    logger.debug("Printing apk md5: " + md5Entry);
    exec(md5Entry, { maxBuffer: 524288 }, function(err, stdout) {
     entryHash = md5re.exec(stdout);
     entryHash = entryHash ? entryHash[1] : null;
     logger.debug('entryHash MD5: ' + entryHash);
     logger.debug(' keystore MD5: ' + keystoreHash);
     var matchesKeystore = entryHash && entryHash === keystoreHash;
     logger.debug('Matches keystore? ' + matchesKeystore);
     if (matchesKeystore) {
       return cb(null, true);
     } else {
       next();
     }
    });
  }.bind(this);

  next();
};

ADB.prototype.getDevicesWithRetry = function(timeoutMs, cb) {
  if (typeof timeoutMs === "function") {
    cb = timeoutMs;
    timeoutMs = 20000;
  }
  var start = Date.now();
  logger.info("Trying to find a connected android device");
  var error = new Error("Could not find a connected Android device.");
  var getDevices = function() {
    this.getConnectedDevices(function(err, devices) {
      if (err || devices.length < 1) {
        if ((Date.now() - start) > timeoutMs) {
          cb(error);
        } else {
          logger.info("Could not find devices, restarting adb server...");
          setTimeout(function() {
            this.restartAdb(function() {
              getDevices();
            }.bind(this));
          }.bind(this), 1000);
        }
      } else {
        cb(null, devices);
      }
    }.bind(this));
  }.bind(this);
  getDevices();
};

ADB.prototype.getEmulatorPort = function(cb) {
  logger.info("Getting running emulator port");
  if (this.emulatorPort !== null) {
    return cb(null, this.emulatorPort);
  }
  this.getConnectedDevices(function(err, devices) {
    if (err || devices.length < 1) {
      cb(new Error("No devices connected"));
    } else {
      // pick first device
      var port = this.getPortFromEmulatorString(devices[0].udid);
      if (port) {
        cb(null, port);
      } else {
        cb(new Error("Emulator port not found"));
      }
    }
  }.bind(this));
};

ADB.prototype.rimraf = function(path, cb) {
   this.shell('rm -rf ' + path, cb);
};

ADB.prototype.push = function(localPath, remotePath, cb) {
  try {
    localPath = JSON.parse(localPath);
  } catch(e) { }
  localPath = JSON.stringify(localPath);
  this.exec('push ' + localPath + ' ' + remotePath, cb);
};

ADB.prototype.pull = function(remotePath, localPath, cb) {
  try {
    localPath = JSON.parse(localPath);
  } catch(e) { }
  localPath = JSON.stringify(localPath);
  this.exec('pull ' + remotePath + ' ' + localPath, cb);
};

ADB.prototype.getPortFromEmulatorString = function(emStr) {
  var portPattern = /emulator-(\d+)/;
  if (portPattern.test(emStr)) {
    return parseInt(portPattern.exec(emStr)[1], 10);
  }
  return false;
};

ADB.prototype.getRunningAVDName = function(cb) {
  logger.info("Getting running AVD name");
  this.sendTelnetCommand("avd name", cb);
};

ADB.prototype.killAllEmulators = function(cb) {
  var killallCmd = isWindows ?
    "TASKKILL /IM emulator.exe" :
    "/usr/bin/killall -m emulator*";
  exec(killallCmd, { maxBuffer: 524288 }, function(err) {
    if (err) {
      logger.info("Could not kill emulator. It was probably not running.: " +
        err.message);
    }
    cb();
  });
};

ADB.prototype.launchAVD = function(avdName, cb) {
  logger.info("Launching Emulator with AVD " + avdName);
  this.checkSdkBinaryPresent("emulator", function(err, emulatorBinaryPath) {
    if (err) return cb(err);

    if (avdName[0] !== "@") {
      avdName = "@" + avdName;
    }

    try {
      spawn(emulatorBinaryPath.substr(1, emulatorBinaryPath.length - 2),
        [avdName]);
    } catch (err) {
      return cb(err);
    }
    this.getDeviceWithRetry(120000, cb);
  }.bind(this));
};

ADB.prototype.getConnectedDevices = function(cb) {
  this.debug("Getting connected devices...");
  this.exec("devices", function(err, stdout) {
    if (err) return cb(err);
    if (stdout.toLowerCase().indexOf("error") !== -1) {
      logger.error(stdout);
      cb(new Error(stdout));
    } else {
      var devices = [];
      _.each(stdout.split("\n"), function(line) {
        if (line.trim() !== "" &&
            line.indexOf("List of devices") === -1 &&
            line.indexOf("* daemon") === -1 &&
            line.indexOf("offline") == -1) {
          var lineInfo = line.split("\t");
          // state is either "device" or "offline", afaict
          devices.push({udid: lineInfo[0], state: lineInfo[1]});
        }
      });
      this.debug(devices.length + " device(s) connected");
      cb(null, devices);
    }
  }.bind(this));
};

ADB.prototype.forwardPort = function(systemPort, devicePort, cb) {
  this.debug("Forwarding system:" + systemPort + " to device:" + devicePort);
  this.exec("forward tcp:" + systemPort + " tcp:" + devicePort, cb);
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

ADB.prototype.setEmulatorPort = function(emPort) {
  this.emulatorPort = emPort;
};

ADB.prototype.waitForDevice = function(cb) {
  var doWait = function(innerCb) {
    this.debug("Waiting for device to be ready and to respond to shell " +
               "commands (timeout = " + this.appDeviceReadyTimeout + ")");
    var movedOn = false
      , timeoutSecs = parseInt(this.appDeviceReadyTimeout, 10);

    setTimeout(function() {
      if (!movedOn) {
        movedOn = true;
        innerCb("Device did not become ready in " + timeoutSecs + " secs; " +
                "are you sure it's powered on?");
      }
    }.bind(this), timeoutSecs * 1000);

    this.exec("wait-for-device", function(err) {
      if (!movedOn) {
        if (err) {
          logger.error("Error running wait-for-device");
          movedOn = true;
          innerCb(err);
        } else {
          this.shell("echo 'ready'", function(err) {
            if (!movedOn) {
              movedOn = true;
              if (err) {
                logger.error("Error running shell echo: " + err);
                innerCb(err);
              } else {
                innerCb();
              }
            }
          }.bind(this));
        }
      }
    }.bind(this));
  }.bind(this);

  doWait(function(err) {
    if (err) {
      this.restartAdb(function() {
        this.getConnectedDevices(function() {
          doWait(cb);
        });
      }.bind(this));
    } else {
      cb(null);
    }
  }.bind(this));
};

ADB.prototype.restartAdb = function(cb) {
  this.exec("kill-server", function(err) {
    if (err) {
      logger.error("Error killing ADB server, going to see if it's online " +
                   "anyway");
    }
    cb();
  });
};

ADB.prototype.startLogcat = function(cb) {
  if (this.logcat !== null) {
    cb(new Error("Trying to start logcat capture but it's already started!"));
    return;
  }
  var adb = this.adb.replace(/"/g, '');
  this.logcat = new Logcat({
    adbCmd: adb
    , debug: false
    , debugTrace: false
  });
  this.logcat.startCapture(cb);
};

ADB.prototype.stopLogcat = function(cb) {
  if (this.logcat !== null) {
    this.logcat.stopCapture(cb);
  }
};

ADB.prototype.getLogcatLogs = function() {
  if (this.logcat === null) {
    throw new Error("Can't get logcat logs since logcat hasn't started");
  }
  return this.logcat.getLogs();
};

ADB.prototype.startApp = function(pkg, activity, waitActivity, cb) {
  if (typeof waitActivity === "function") {
    cb = waitActivity;
    waitActivity = false;
  }

  var cmd = "am start -n " + pkg + "/" + activity;
  this.shell(cmd, function(err, stdout) {
    if(err) return cb(err);
    if (stdout.indexOf("Error: Activity class") !== -1 &&
        stdout.indexOf("does not exist") !== -1) {
      if (activity[0] !== ".") {
        logger.info("We tried to start an activity that doesn't exist, " +
                    "retrying with . prepended to activity");
        activity = "." + activity;
        return this.startApp(pkg, activity, cb);
      } else {
        var msg = "Activity used to start app doesn't exist! Make sure " +
                  "it exists";
        logger.error(msg);
        return cb(new Error(msg));
      }
    }

    if (waitActivity) {
      this.waitForActivity(pkg, waitActivity, cb);
    } else {
      cb();
    }
  }.bind(this));
};

ADB.prototype.getFocusedPackageAndActivity = function(cb) {
  logger.info("Getting focused package and activity");
  var cmd = "dumpsys window windows"
    , searchRe = new RegExp(/mFocusedApp.+ ([a-zA-Z0-9\._]+)\/(\.?[^\}]+)\}/);

  this.shell(cmd, function(err, stdout) {
    if (err) return cb(err);
    var foundMatch = false;
    _.each(stdout.split("\n"), function(line) {
      var match = searchRe.exec(line);
      if (match) {
        foundMatch = match;
      }
    });
    if (foundMatch) {
      cb(null, foundMatch[1].trim(), foundMatch[2].trim());
    } else {
      cb(new Error("Could not parse activity from dumpsys"));
    }
  }.bind(this));
};

ADB.prototype.waitForActivityOrNot = function(pkg, activity, not,
    waitMs, cb) {
  if (typeof waitMs === "function") {
    cb = waitMs;
    waitMs = 20000;
  }

  logger.info("Waiting for activity to " + (not ? "not" : "") + " be focused");
  var intMs = 750
    , endAt = Date.now() + waitMs;

  if (activity.indexOf(pkg) === 0) {
    activity = activity.substring(pkg.length);
  }

  var checkForActivity = function(foundPackage, foundActivity) {
    var foundAct = false;
    if (foundPackage === pkg) {
      _.each(activity.split(','), function(act) {
        act = act.trim();
        if (act === foundActivity || "." + act === foundActivity) {
          foundAct = true;
        }
      });
    }
    return foundAct;
  };

  var wait = function() {
    this.getFocusedPackageAndActivity(function(err, foundPackage,
          foundActivity) {
      var foundAct = checkForActivity(foundPackage, foundActivity);
      if ((!not && foundAct) || (not && !foundAct)) {
        cb();
      } else if (Date.now() < endAt) {
        if (err) logger.info(err);
        setTimeout(wait, intMs);
      } else {
        var verb = not ? "stopped" : "started";
        var msg = "Activity " + activity + " never " + verb + ". Current: " +
                  foundPackage + "/" + foundActivity;
        logger.error(msg);
        cb(new Error(msg));
      }
    }.bind(this));
  }.bind(this);

  wait();
};

ADB.prototype.waitForActivity = function(pkg, act, waitMs, cb) {
  this.waitForActivityOrNot(pkg, act, false, waitMs, cb);
};

ADB.prototype.waitForNotActivity = function(pkg, act, waitMs, cb) {
  this.waitForActivityOrNot(pkg, act, true, waitMs, cb);
};

ADB.prototype.uninstallApk = function(pkg, cb) {
  logger.info("Uninstalling " + pkg);
  this.exec("uninstall " + pkg, function(err, stdout) {
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
      cb();
    }
  });
};

ADB.prototype.installRemote = function(remoteApk, cb) {
  var cmd = 'pm install -r ' + remoteApk;
  this.shell(cmd, cb);
};

ADB.prototype.install = function(apk, replace, cb) {
  if (typeof replace === "function") {
    cb = replace;
    replace = true;
  }
  var cmd = 'install ';
  if (replace) {
    cmd += '-r ';
  }
  cmd += apk;
  this.exec(cmd, cb);
};

ADB.prototype.mkdir = function(remotePath, cb) {
  this.shell('mkdir -p ' + remotePath, cb);
};

ADB.prototype.instrument = function(pkg, activity, instrumentWith, cb) {
  if (activity.indexOf(pkg) === 0) {
    activity = activity.substring(pkg.length);
  }
  var cmd = "am instrument -e main_activity '" + pkg + activity + "' " +
            instrumentWith;
  cmd = cmd.replace(/\.+/g,'.'); // Fix pkg..activity error
  this.shell(cmd, function(err, stdout) {
    if (err) return cb(err);
    if (stdout.indexOf("Exception") !== -1) {
      logger.error(stdout);
      var msg = stdout.split("\n")[0] || "Unknown exception during " +
                                         "instrumentation";
      return cb(new Error(msg));
    }
    cb();
  });
};

ADB.prototype.checkAndSignApk = function(apk, pkg, cb) {
  this.checkApkCert(apk, pkg, function(err, appSigned) {
    if (err) return cb(err);
    if (!appSigned) {
      this.sign([apk], cb);
    } else {
      cb();
    }
  }.bind(this));
};

ADB.prototype.forceStop = function(pkg, cb) {
  this.shell('am force-stop ' + pkg, cb);
};

ADB.prototype.clear = function(pkg, cb) {
  this.shell("pm clear " + pkg, cb);
};

ADB.prototype.stopAndClear = function(pkg, cb) {
  this.forceStop(pkg, function(err) {
    if (err) return cb(err);
    this.clear(pkg, cb);
  }.bind(this));
};

ADB.prototype.isAppInstalled = function(pkg, cb) {
  var installed = false;

  logger.debug("Getting install status for " + pkg);
  var listPkgCmd = "pm list packages -3 " + pkg;
  this.shell(listPkgCmd, function(err, stdout) {
    if (err) return cb(err);
    var apkInstalledRgx = new RegExp('^package:' +
        pkg.replace(/([^a-zA-Z])/g, "\\$1") + '$', 'm');
    installed = apkInstalledRgx.test(stdout);
    this.debug("App is " + (!installed ? "not" : "") + " installed");
    cb(null, installed);
  }.bind(this));
};

ADB.prototype.back = function(cb) {
  this.debug("Pressing the BACK button");
  var cmd = this.adbCmd + " shell input keyevent 4";
  exec(cmd, { maxBuffer: 524288 }, function() {
    cb();
  });
};

ADB.prototype.goToHome = function(cb) {
  this.debug("Pressing the HOME button");
  this.keyevent(3, cb);
};

ADB.prototype.keyevent = function(keycode, cb) {
  var code = parseInt(keycode, 10);
  // keycode must be an int.
  var cmd = 'input keyevent ' + code;
  this.shell(cmd, cb);
};

ADB.prototype.isScreenLocked = function(cb) {
  var cmd = "dumpsys window";
  this.shell(cmd, function(err, stdout) {
    if (err) return cb(err);

    var screenLocked = /mShowingLockscreen=\w+/gi.exec(stdout);
    var samsungNoteUnlocked = /mScreenOnFully=\w+/gi.exec(stdout);
    var gbScreenLocked = /mCurrentFocus.+Keyguard/gi.exec(stdout);

    if (screenLocked && screenLocked[0]) {
      if (screenLocked[0].split('=')[1] == 'false') {
        cb(null, false);
      } else {
        cb(null, true);
      }
    } else if (samsungNoteUnlocked && samsungNoteUnlocked[0]) {
      if (samsungNoteUnlocked[0].split('=')[1] == 'true') {
        cb(null, false);
      } else {
        cb(null, true);
      }
    } else if (gbScreenLocked && gbScreenLocked[0]) {
      cb(null, true);
    } else {
      cb(null, false);
    }

  });
};

ADB.prototype.sendTelnetCommand = function(command, cb) {
  logger.info("Sending telnet command to device: " + command);
  this.getEmulatorPort(function(err, port) {
    if (err) return cb(err);
    var conn = net.createConnection(port, 'localhost');
    var connected = false;
    var readyRegex = /^OK$/m;
    var dataStream = "";
    var res = null;
    var onReady = function() {
      logger.info("Socket connection to device ready");
      conn.write(command + "\n");
    };
    conn.on('connect', function() {
      logger.info("Socket connection to device created");
    });
    conn.on('data', function(data) {
      data = data.toString('utf8');
      if (!connected) {
        if (readyRegex.test(data)) {
          connected = true;
          onReady();
        }
      } else {
        dataStream += data;
        if (readyRegex.test(data)) {
          res = dataStream.replace(readyRegex, "").trim();
          logger.info("Telnet command got response: " + res);
          conn.write("quit\n");
        }
      }
    });
    conn.on('close', function() {
      if (res === null) {
        cb(new Error("Never got a response from command"));
      } else {
        cb(null, res);
      }
    });
  });
};

module.exports = ADB;
