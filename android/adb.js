"use strict";

var spawn = require('win-spawn')
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
  , _ = require('underscore')
  , helpers = require('../app/helpers')
  , AdmZip = require('adm-zip')
  , getTempPath = helpers.getTempPath
  , rimraf = require('rimraf')
  , Logcat = require('./logcat')
  , isWindows = helpers.isWindows()
  , md5 = require('MD5')
  , deviceState = require('./device_state');

var noop = function() {};

var ADB = function(opts, android) {
  if (!opts) {
    opts = {};
  }
  if (typeof opts.sdkRoot === "undefined") {
    opts.sdkRoot = process.env.ANDROID_HOME || '';
  }
  this.compressXml = opts.compressXml;
  this.sdkRoot = opts.sdkRoot;
  this.udid = opts.udid;
  this.webSocket = opts.webSocket;
  // Don't uninstall if using fast reset.
  // Uninstall if reset is set and fast reset isn't.
  this.skipUninstall = opts.fastReset || !opts.reset || false;
  this.fastReset = opts.fastReset;
  this.cleanApp = opts.cleanApp || this.fastReset;
  this.systemPort = opts.systemPort || 4724;
  this.internalDevicePort = opts.devicePort || 4724;
  this.avdName = opts.avdName;
  this.appPackage = opts.appPackage;
  this.appActivity = opts.appActivity;
  this.appWaitActivity = opts.appWaitActivity;
  this.appDeviceReadyTimeout = opts.appDeviceReadyTimeout;
  this.apkPath = opts.apkPath;
  this.useKeystore = opts.useKeystore;
  this.keystorePath = opts.keystorePath;
  this.keystorePassword = opts.keystorePassword;
  this.keyAlias = opts.keyAlias;
  this.keyPassword = opts.keyPassword;
  this.adb = "adb";
  this.adbCmd = this.adb;
  this.curDeviceId = null;
  this.socketClient = null;
  this.proc = null;
  this.onSocketReady = noop;
  this.onExit = noop;
  this.alreadyExited = false;
  this.portForwarded = false;
  this.emulatorPort = null;
  this.debugMode = true;
  this.logcat = null;
  // This is set to true when the bootstrap jar crashes.
  this.restartBootstrap = false;
  // The android ref is used to resend the command that
  // detected the crash.
  this.android = android;
  this.cmdCb = null;
  this.binaries = {};
  this.resendLastCommand = function() {};
  this.appMD5 = null;
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
      cb(new Error("Could not find " + binary + " in tools, platform-tools, or build-tools under \"" + this.sdkRoot + "\"; " +
                   "do you have android SDK installed into this location?"),
         null);
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
                     "added to your PATH?"),
           null);
      }
    }.bind(this));
  }
};

ADB.prototype.checkAdbPresent = function(cb) {
  this.checkSdkBinaryPresent("adb", function(err, binaryLoc) {
    if (err) return cb(err);
    this.adb = binaryLoc.trim();
    cb(null);
  }.bind(this));
};

ADB.prototype.checkAppPresent = function(cb) {
  if (this.apkPath === null) {
    logger.info("Not checking whether app is present since we are assuming " +
                "it's already on the device");
    cb(null);
  } else {
    logger.info("Checking whether app is actually present");
    fs.stat(this.apkPath, function(err) {
      if (err) {
        logger.error("Could not find app apk at " + this.apkPath);
        cb(new Error("Error locating the app apk, supposedly it's at " +
                    this.apkPath + " but we can't stat it. Filesystem error " +
                    "is " + err));
      } else {
        cb(null);
      }
    }.bind(this));
  }
};

ADB.prototype.insertSelendroidManifest = function(serverPath, cb) {
  logger.info("Inserting selendroid manifest");
  var newServerPath = this.selendroidServerPath
    , newPackage = this.appPackage + '.selendroid'
    , srcManifest = path.resolve(__dirname, '..', 'build', 'selendroid',
        'AndroidManifest.xml')
    , dstDir = path.resolve(getTempPath(), this.appPackage)
    , dstManifest = path.resolve(dstDir, 'AndroidManifest.xml');

  try {
    fs.mkdirSync(dstDir);
  } catch (e) {
    if (e.message.indexOf("EEXIST") === -1) {
      throw e;
    }
  }
  fs.writeFileSync(dstManifest, fs.readFileSync(srcManifest, "utf8"), "utf8");
  async.series([
    function(cb) { mkdirp(dstDir, cb); }.bind(this),
    function(cb) { this.checkSdkBinaryPresent("aapt", cb); }.bind(this),
    function(cb) { this.compileManifest(dstManifest, newPackage, this.appPackage, cb); }.bind(this),
    function(cb) { this.insertManifest(dstManifest, serverPath, newServerPath,
      cb); }.bind(this)
  ], cb);
};

ADB.prototype.compileManifest = function(manifest, manifestPackage, targetPackage, cb) {
  logger.info("Compiling manifest " + manifest);

  var platform = helpers.getAndroidPlatform();
  if (!platform || !platform[1]) {
    return cb(new Error("Required platform doesn't exist (API level >= 17)"));
  }

  // Compile manifest into manifest.xml.apk
  var compileManifest = [this.binaries.aapt + ' package -M "', manifest + '"',
                         ' --rename-manifest-package "',  manifestPackage + '"',
                         ' --rename-instrumentation-target-package "', targetPackage + '"',
                         ' -I "', path.resolve(platform[1], 'android.jar') +'" -F "',
                         manifest, '.apk" -f'].join('');
  logger.debug(compileManifest);
  exec(compileManifest, { maxBuffer: 524288 }, function(err, stdout, stderr) {
    if (err) {
      logger.debug(stderr);
      return cb("error compiling manifest");
    }
    logger.debug("Compiled manifest");
    cb(null);
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
    if (isWindows) {
      var java = path.resolve(process.env.JAVA_HOME, 'bin', 'java');
      java = isWindows ? '"' + java + '.exe"' : '"' + java + '"';
      var moveManifestCmd = '"' + path.resolve(__dirname, '..', 'app', 'android', 'move_manifest.jar') + '"';
      moveManifestCmd = [java, '-jar', moveManifestCmd, '"' + dstApk + '"', '"' + manifest + '"'].join(' ');

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
        cb(null);
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

// apks is an array of strings.
ADB.prototype.signDefault = function(apks, cb) {
  var signPath = path.resolve(__dirname, '..', 'app', 'android', 'sign.jar');
  var resign = 'java -jar "' + signPath + '" "' + apks.join('" "') + '" --override';
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

// apk is a single apk path
ADB.prototype.signCustom = function(apk, cb) {
  var jarsigner = path.resolve(process.env.JAVA_HOME, 'bin', 'jarsigner');
  jarsigner = isWindows ? '"' + jarsigner + '.exe"' : '"' + jarsigner + '"';
  var java = path.resolve(process.env.JAVA_HOME, 'bin', 'java');
  java = isWindows ? '"' + java + '.exe"' : '"' + java + '"';
  var unsign = '"' + path.resolve(__dirname, '..', 'app', 'android', 'unsign.jar') + '"';
  unsign = [java, '-jar', unsign, '"' + apk + '"'].join(' ');
  // "jarsigner" "blank.apk" -sigalg MD5withRSA -digestalg SHA1
  // -keystore "./key.keystore" -storepass "android"
  // -keypass "android" "androiddebugkey"
  if (!fs.existsSync(this.keystorePath)) {
    return cb(new Error("Keystore doesn't exist. " + this.keystorePath));
  }

  var sign = [jarsigner, '"' + apk + '"', '-sigalg MD5withRSA', '-digestalg SHA1',
  '-keystore "' + this.keystorePath + '"', '-storepass "' + this.keystorePassword + '"',
  '-keypass "' + this.keyPassword + '"', '"' + this.keyAlias + '"'].join(' ');
  logger.debug("Unsigning apk with: " + unsign);
  exec(unsign, { maxBuffer: 524288 }, function(err, stdout, stderr) {
    if (stderr) {
      logger.warn(stderr);
      return cb(new Error("Could not unsign apk. Are you sure " +
                          "the file path is correct: " +
                          JSON.stringify(apk)));
    }
    logger.debug("Signing apk with: " + sign);
    exec(sign, { maxBuffer: 524288 }, function(err, stdout, stderr) {
      if (stderr) {
        logger.warn(stderr);
        return cb(new Error("Could not sign apk. Are you sure " +
                            "the file path is correct: " +
                            JSON.stringify(apk)));
      }
      cb(err);
    });
  });
};

// apks is an array of strings.
ADB.prototype.sign = function(apks, cb) {
  if (this.useKeystore) {
    async.each(apks, this.signCustom.bind(this), function(err) {
      cb(err);
    });
  } else {
    this.signDefault(apks, cb);
  }
};

// returns true when already signed, false otherwise.
ADB.prototype.checkApkCert = function(apk, cb) {
  if (!fs.existsSync(apk)) {
   logger.debug("APK doesn't exist. " + apk);
   return cb(false);
  }

  if (this.useKeystore) {
    var h = "a-fA-F0-9";
    var md5Str = ['.*MD5.*((?:[', h, ']{2}:){15}[', h, ']{2})'].join('');
    var md5 = new RegExp(md5Str, 'mi');
    var keytool = path.resolve(process.env.JAVA_HOME, 'bin', 'keytool');
    keytool = isWindows ? '"' + keytool + '.exe"' : '"' + keytool + '"';
    var keystoreHash = null;

    var checkKeystoreMD5 = function(innerCb) {
    logger.debug("checkKeystoreMD5");
      // get keystore md5
      var keystore = [keytool, '-v', '-list', '-alias "' + this.keyAlias + '"',
      '-keystore "' + this.keystorePath + '"', '-storepass "' + this.keystorePassword + '"'].join(' ');
      logger.debug("Printing keystore md5: " + keystore);
      exec(keystore, { maxBuffer: 524288 }, function(err, stdout) {
         keystoreHash = md5.exec(stdout);
         keystoreHash = keystoreHash ? keystoreHash[1] : null;
         logger.debug(' Keystore MD5: ' + keystoreHash);
         innerCb();
      });
    };

    var match = false;
    var checkApkMD5 = function(innerCb) {
      logger.debug("checkApkMD5");
      var entryHash = null;
      var zip = new AdmZip(apk);
      var rsa = /^META-INF\/.*\.[rR][sS][aA]$/;
      var entries = zip.getEntries();
      var next = function() {
        var entry = entries.pop(); // meta-inf tends to be at the end
        if (!entry) return innerCb(); // no more entries
        entry = entry.entryName;
        if (!rsa.test(entry)) return next();
        logger.debug("Entry: " + entry);
        var entryPath = path.join(getTempPath(), this.appPackage, 'cert');
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
         entryHash = md5.exec(stdout);
         entryHash = entryHash ? entryHash[1] : null;
         logger.debug('entryHash MD5: ' + entryHash);
         logger.debug(' keystore MD5: ' + keystoreHash);
         var matchesKeystore = entryHash && entryHash === keystoreHash;
         logger.debug('Matches keystore? ' + matchesKeystore);
         if (matchesKeystore) {
           match = true;
           return innerCb();
         } else {
           next();
         }
        });
      }.bind(this);
      next();
    };

    async.series([
      function(cb) { checkKeystoreMD5(cb); },
      function(cb) { checkApkMD5(cb); }
    ], function() { logger.debug("checkApkCert match? " + match);
     cb(match); });

    // exit checkApkCert
    return;
  }

  var verifyPath = path.resolve(__dirname, '..', 'app', 'android',
      'verify.jar');
  var resign = 'java -jar "' + verifyPath + '" "' + apk + '"';
  logger.debug("Checking app cert for " + apk + ": " + resign);
  exec(resign, { maxBuffer: 524288 }, function(err) {
    if (err) {
      logger.debug("App not signed with debug cert.");
      return cb(false);
    }
    logger.debug("App already signed.");
    cb(true);
  });
};

ADB.prototype.getDeviceWithRetry = function(cb, count) {
  logger.info("Trying to find a connected android device");
  var error = new Error("Could not find a connected Android device.");
  var getDevices = function(innerCb) {
    this.getConnectedDevices(function(err, devices) {
      if (typeof devices === "undefined" || devices.length === 0 || err) {
        return innerCb(error);
      }
      innerCb(null);
    });
  }.bind(this);
  getDevices(function(err) {
    count = count || 1;
    if (err) {
      if (count < 10) {
        logger.info("Could not find devices, restarting adb server...");
        this.restartAdb(function() {
          this.getDeviceWithRetry(cb, count + 1);
        }.bind(this));
      } else {
        logger.info("Looked for devices " + count + " times. Giving up");
        cb(error);
      }
    } else {
      logger.info("Found device, no need to retry");
      cb(null);
    }
  }.bind(this));
};

ADB.prototype.prepareDevice = function(onReady) {
  logger.info("Preparing device for session");
  async.series([
    function(cb) { this.checkAppPresent(cb); }.bind(this),
    function(cb) { this.checkAdbPresent(cb); }.bind(this),
    function(cb) { this.prepareEmulator(cb); }.bind(this),
    function(cb) { this.getDeviceWithRetry(cb);}.bind(this),
    function(cb) { this.waitForDevice(cb); }.bind(this),
    function(cb) { this.startLogcat(cb); }.bind(this)
  ], onReady);
};

ADB.prototype.requestXmlCompression = function(cb) {
  if (this.compressXml) {
    this.android.proxy(["enableCompressedLayoutHeirarchy"], cb);
  } else {
    cb(null);
  }
};

ADB.prototype.pushStrings = function(cb) {
  var remotePath = '/data/local/tmp';
  var stringsJson = 'strings.json';
  if (!fs.existsSync(this.apkPath)) {
   // apk doesn't exist locally so remove old strings.json
   var pushCmd = this.adbCmd + ' shell rm ' + remotePath + '/' + stringsJson;
   logger.debug("Apk doesn't exist. Removing old strings.json " + pushCmd);
   exec(pushCmd, { maxBuffer: 524288 }, function(err, stdout, stderr) {
     cb(null);
   });
  } else {
    var stringsFromApkJarPath = path.resolve(__dirname, '..', 'app', 'android',
        'strings_from_apk.jar');
    var outputPath = path.resolve(getTempPath(), this.appPackage);
    var makeStrings = ['java -jar "', stringsFromApkJarPath,
                       '" "', this.apkPath, '" "', outputPath, '"'].join('');
    logger.debug(makeStrings);
    exec(makeStrings, { maxBuffer: 524288 }, function(err, stdout, stderr) {
      if (err) {
        logger.debug(stderr);
        return cb("error making strings");
      }
      var jsonFile = path.resolve(outputPath, stringsJson);

      var pushCmd = this.adbCmd + ' push "' + jsonFile + '" ' + remotePath;
      exec(pushCmd, { maxBuffer: 524288 }, function(err, stdout, stderr) {
        cb(null);
      });
    }.bind(this));
  }
};

ADB.prototype.startAppium = function(onReady, onExit) {
  logger.info("Starting android appium");
  this.onExit = onExit;

  logger.debug("Using fast reset? " + this.fastReset);

  async.series([
    function(cb) { this.prepareDevice(cb); }.bind(this),
    function(cb) { this.pushStrings(cb); }.bind(this),
    function(cb) { this.requestXmlCompression(cb); }.bind(this),
    function(cb) { this.uninstallApp(cb); }.bind(this),
    function(cb) { this.installApp(cb); }.bind(this),
    function(cb) { this.forwardPort(cb); }.bind(this),
    function(cb) { this.pushAppium(cb); }.bind(this),
    function(cb) { this.pushUnlock(cb); }.bind(this),
    function(cb) { this.runBootstrap(cb, onExit); }.bind(this),
    function(cb) { this.wakeUp(cb); }.bind(this),
    function(cb) { this.unlockScreen(cb); }.bind(this),
    function(cb) { this.startApp(cb); }.bind(this)
  ], function(err, seriesInfo) {
    onReady(err);
  });
};

ADB.prototype.startChrome = function(onReady) {
  logger.info("Starting Chrome");
  logger.debug("Using fast reset? " + this.fastReset);

  async.series([
    function(cb) { this.prepareDevice(cb); }.bind(this),
    function(cb) { this.installApp(cb); }.bind(this),
    function(cb) { this.startApp(cb); }.bind(this)
  ], onReady);
};

ADB.prototype.startSelendroid = function(serverPath, onReady) {
  logger.info("Starting selendroid");
  var modServerExists = false
    , modAppPkg = this.appPackage + '.selendroid';
  this.selendroidServerPath = path.resolve(getTempPath(),
      'selendroid.' + this.appPackage + '.apk');

  var checkModServerExists = function(cb) {
    fs.stat(this.selendroidServerPath, function(err) {
      modServerExists = !err;
      cb();
    });
  }.bind(this);

  var conditionalUninstallSelendroid = function(cb) {
    if (!modServerExists) {
      // assume we're going to rebuild selendroid and therefore
      // need to uninstall it if it's already on device
      logger.info("Rebuilt selendroid apk does not exist, uninstalling " +
                  "any instances of it on device to make way for new one");
      this.uninstallApk(modAppPkg, cb);
    } else {
      logger.info("Rebuilt selendroid apk exists, doing nothing");
      cb();
    }
  }.bind(this);

  var conditionalInsertManifest = function(cb) {
    if (!modServerExists) {
      logger.info("Rebuilt selendroid server does not exist, inserting " +
                  "modified manifest");
      this.insertSelendroidManifest(serverPath, cb);
    } else {
      logger.info("Rebuilt selendroid server already exists, no need to " +
                  "rebuild it with a new manifest");
      cb();
    }
  }.bind(this);

  var conditionalInstallSelendroid = function(cb) {
    this.checkAppInstallStatus(modAppPkg, function(e, installed) {
      if (!installed) {
        logger.info("Rebuilt selendroid is not installed, installing it");
        this.installApk(this.selendroidServerPath, cb);
      } else {
        logger.info("Rebuilt selendroid is already installed");
        cb();
      }
    }.bind(this));
  }.bind(this);

  async.series([
    function(cb) { this.prepareDevice(cb); }.bind(this),
    function(cb) { checkModServerExists(cb); },
    function(cb) { conditionalUninstallSelendroid(cb); },
    function(cb) { conditionalInsertManifest(cb); },
    function(cb) { this.checkSelendroidCerts(this.selendroidServerPath, cb); }.bind(this),
    function(cb) { conditionalInstallSelendroid(cb); },
    function(cb) { this.installApp(cb); }.bind(this),
    function(cb) { this.forwardPort(cb); }.bind(this),
    function(cb) { this.pushUnlock(cb); }.bind(this),
    function(cb) { this.unlockScreen(cb); }.bind(this),
    function(cb) { this.pushSelendroid(cb); }.bind(this),
    function(cb) { logger.info("Selendroid server is launching"); cb(); }
  ], onReady);
};

ADB.prototype.pushSelendroid = function(cb) {
  var activityString = this.appActivity;
  if (activityString.indexOf(this.appPackage) === 0) {
    activityString = activityString.substring(this.appPackage.length);
  }
  var cmd = this.adbCmd + " shell am instrument -e main_activity '" +
            this.appPackage + activityString + "' " + this.appPackage +
            ".selendroid/io.selendroid.ServerInstrumentation";
  cmd = cmd.replace(/\.+/g,'.'); // Fix pkg..activity error
  logger.info("Starting instrumentation process for selendroid with cmd: " +
              cmd);
  exec(cmd, { maxBuffer: 524288 }, function(err, stdout) {
    if (err) return cb(err);
    if (stdout.indexOf("Exception") !== -1) {
      logger.error(stdout);
      var msg = stdout.split("\n")[0] || "Unknown exception starting selendroid";
      return cb(new Error(msg));
    }
    cb();
  });
};

ADB.prototype.checkSelendroidCerts = function(serverPath, cb) {
  var alreadyReturned = false
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
    this.checkApkCert(apk, function(isSigned) {
      if (isSigned) return onDoneSigning();
      this.sign([apk], function(err) {
        if (err && !alreadyReturned) {
          alreadyReturned = true;
          return cb(err);
        }
        onDoneSigning();
      });
    }.bind(this));
  }, this);
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
      var port = this.getPortFromEmulatorString(devices[0]);
      if (port) {
        cb(null, port);
      } else {
        cb(new Error("Emulator port not found"));
      }
    }
  }.bind(this));
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

ADB.prototype.prepareEmulator = function(cb) {
  if (this.avdName !== null) {
    this.getRunningAVDName(function(err, runningAVDName) {
      if (!err && this.avdName.replace('@','') === runningAVDName) {
        logger.info("Did not launch AVD because it was already running.");
        cb(null);
      } else {
        logger.info("Launching Emulator with AVD " + this.avdName);
        var killallCmd = isWindows ? "TASKKILL /IM emulator.exe" : "/usr/bin/killall -m emulator*";
        exec(killallCmd, { maxBuffer: 524288 }, function(err, stdout) {
          if (err) {
            logger.info("Could not kill emulator. It was probably not running. : " + err.message);
          }
          this.checkSdkBinaryPresent("emulator", function(err, emulatorBinaryPath) {
            if (err) {
              return cb(err);
            }
            if (this.avdName[0] !== "@") {
              this.avdName = "@" + this.avdName;
            }
            var emulatorProc = spawn(emulatorBinaryPath.substr(1, emulatorBinaryPath.length - 2), [this.avdName]);
            var timeoutMs = 120000;
            var now = Date.now();
            var checkEmulatorAlive = function() {
              this.restartAdb(function() {
                this.getConnectedDevices(function(err, devices) {
                  if (!err && devices.length) {
                    cb(null, true);
                  } else if (Date.now() < (now + timeoutMs)) {
                    setTimeout(checkEmulatorAlive, 2000);
                  } else {
                    cb(new Error("Emulator didn't come up in " + timeoutMs + "ms"));
                  }
                }.bind(this));
              }.bind(this));
            }.bind(this);
            checkEmulatorAlive();
          }.bind(this));
        }.bind(this));
      }
    }.bind(this));
  } else {
    cb();
  }
};


ADB.prototype.getConnectedDevices = function(cb) {
  this.debug("Getting connected devices...");
  exec(this.adb + " devices", { maxBuffer: 524288 }, function(err, stdout) {
    if (err) {
      logger.error(err);
      cb(err);
    } else if (stdout.toLowerCase().indexOf("error") !== -1) {
      logger.error(stdout);
      cb(new Error(stdout));
    } else {
      var devices = [];
      _.each(stdout.split("\n"), function(line) {
        if (line.trim() !== "" && line.indexOf("List of devices") === -1 && line.indexOf("* daemon") === -1 && line.indexOf("offline") == -1) {
          var lineInfo = line.split("\t");
          devices.push({udid: lineInfo[0], state: lineInfo[1]}); // state is either "device" or "offline", afaict
        }
      });
      this.debug(devices.length + " device(s) connected");
      if (devices.length) {
        this.debug("Setting device id to " + (this.udid || devices[0].udid));
        this.emulatorPort = null;
        var emPort = this.getPortFromEmulatorString(devices[0].udid);
        this.setDeviceId(this.udid || devices[0].udid);
        if (emPort && !this.udid) {
          this.emulatorPort = emPort;
        }
      }
      cb(null, devices);
    }
  }.bind(this));
};

ADB.prototype.forwardPort = function(cb) {
  this.requireDeviceId();
  this.debug("Forwarding system:" + this.systemPort + " to device:" +
             this.internalDevicePort);
  var arg = "tcp:" + this.systemPort + " tcp:" + this.internalDevicePort;
  exec(this.adbCmd + " forward " + arg, { maxBuffer: 524288 }, function(err) {
    if (err) {
      logger.error(err);
      cb(err);
    } else {
      this.portForwarded = true;
      cb(null);
    }
  }.bind(this));
};

ADB.prototype.runBootstrap = function(readyCb, exitCb) {
  logger.info("Running bootstrap");
  this.requireDeviceId();
  var args = ["-s", this.curDeviceId, "shell", "uiautomator", "runtest",
      "AppiumBootstrap.jar", "-c", "io.appium.android.bootstrap.Bootstrap"];
  logger.info(this.adb + " " + args.join(" "));
  this.proc = spawn(this.adb.substr(1, this.adb.length - 2), args);
  this.onSocketReady = readyCb;

  this.proc.stdout.on('data', function(data) {
    this.outputStreamHandler(data);
  }.bind(this));

  this.proc.stderr.on('data', function(data) {
    this.errorStreamHandler(data);
  }.bind(this));

  this.proc.on('exit', function(code) {
    this.cmdCb = null;
    if (this.socketClient) {
      this.socketClient.end();
      this.socketClient.destroy();
      this.socketClient = null;
    }

    if (this.restartBootstrap === true) {
      // The bootstrap jar has crashed so it must be restarted.
      this.restartBootstrap = false;
      this.runBootstrap(function() {
        // Resend last command because the client is still waiting for the
        // response.
        this.resendLastCommand();
      }.bind(this), exitCb);
      return;
    }

    if (!this.alreadyExited) {
      this.alreadyExited = true;
      exitCb(code);
    }
  }.bind(this));


};

ADB.prototype.checkForSocketReady = function(output) {
  if (/Appium Socket Server Ready/.test(output)) {
    this.requirePortForwarded();
    this.debug("Connecting to server on device on port " + this.systemPort + "...");
    this.socketClient = net.connect(this.systemPort, function() {
      this.debug("Connected!");
      this.onSocketReady(null);
    }.bind(this));
    this.socketClient.setEncoding('utf8');
    var oldData = '';
    this.socketClient.on('data', function(data) {
      this.debug("Received command result from bootstrap");
      try {
        data = JSON.parse(oldData + data);
        oldData = '';
      } catch (e) {
        logger.info("Stream still not complete, waiting");
        oldData += data;
        return;
      }
      if (this.cmdCb) {
        var next = this.cmdCb;
        this.cmdCb = null;
        next(data);
      } else {
        this.debug("Got data when we weren't expecting it, ignoring:");
        this.debug(JSON.stringify(data));
      }
    }.bind(this));
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
  if (this.cmdCb !== null) {
    logger.warn("Trying to run a command when one is already in progress. " +
                "Will spin a bit and try again");
    var start = Date.now();
    var timeoutMs = 10000;
    var intMs = 200;
    var waitForCmdCbNull = function() {
      if (this.cmdCb === null) {
        this.sendCommand(type, extra, cb);
      } else if ((Date.now() - start) < timeoutMs) {
        setTimeout(waitForCmdCbNull, intMs);
      } else {
        cb(new Error("Never became able to push strings since a command " +
                     "was in process"));
      }
    }.bind(this);
    waitForCmdCbNull();
  } else if (this.socketClient) {
    this.resendLastCommand = function() {
      this.sendCommand(type, extra, cb);
    }.bind(this);
    if (typeof extra === "undefined" || extra === null) {
      extra = {};
    }
    var cmd = {cmd: type};
    cmd = _.extend(cmd, extra);
    var cmdJson = JSON.stringify(cmd) + "\n";
    this.cmdCb = cb;
    var logCmd = cmdJson.trim();
    if (logCmd.length > 1000) {
      logCmd = logCmd.substr(0, 1000) + "...";
    }
    this.debug("Sending command to android: " + logCmd);
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
  setTimeout(function() {
    if (!this.alreadyExited) {
      logger.warn("Android did not shut down fast enough, calling it gone");
      this.alreadyExited = true;
      this.onExit(1);
    }
  }.bind(this), 7000);
  this.sendCommand('shutdown', null, cb);
  if (this.logcat !== null) {
    this.logcat.stopCapture();
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

        var alertRe = /Emitting system alert message/;
        if (alertRe.test(line)) {
          logger.info("Emiting alert message...");
          this.webSocket.sockets.emit('alert', {message: line});
        }
      } else {
        // The dump command will always disconnect UiAutomation.
        // Detect the crash then restart UiAutomation.
        if (line.indexOf("UiAutomationService not connected") !== -1) {
          this.restartBootstrap = true;
        }
        logger.info(("[ADB STDOUT] " + line).grey);
      }
    }
  }, this);
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
  var doWait = function(innerCb) {
    this.debug("Waiting for device " + this.curDeviceId + " to be ready " +
               "and to respond to shell commands (timeout = " +
               this.appDeviceReadyTimeout + ")");
    var movedOn = false
      , cmd = this.adbCmd + " wait-for-device"
      , timeoutSecs = parseInt(this.appDeviceReadyTimeout, 10);

    setTimeout(function() {
      if (!movedOn) {
        movedOn = true;
        innerCb("Device did not become ready in " + timeoutSecs + " secs; " +
                "are you sure it's powered on?");
      }
    }.bind(this), timeoutSecs * 1000);

    exec(cmd, { maxBuffer: 524288 }, function(err) {
      if (!movedOn) {
        if (err) {
          logger.error("Error running wait-for-device");
          movedOn = true;
          innerCb(err);
        } else {
          exec(this.adbCmd + " shell echo 'ready'", function(err) {
            if (!movedOn) {
              movedOn = true;
              if (err) {
                logger.error("Error running shell echo: " + err);
                innerCb(err);
              } else {
                innerCb(null);
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
  logger.info("Killing ADB server so it will come back online");
  var cmd = this.adb + " kill-server";
  exec(cmd, { maxBuffer: 524288 }, function(err) {
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


ADB.prototype.getLogcatLogs = function() {
  if (this.logcat === null) {
    throw new Error("Can't get logcat logs since logcat hasn't started");
  }
  return this.logcat.getLogs();
};

ADB.prototype.pushAppium = function(cb) {
  this.debug("Pushing appium bootstrap to device...");
  var binPath = path.resolve(__dirname, "..", "build", "android_bootstrap", "AppiumBootstrap.jar");
  fs.stat(binPath, function(err) {
    if (err) {
      cb(new Error("Could not find AppiumBootstrap.jar; please run " +
                   "'grunt buildAndroidBootstrap'"));
    } else {
      var remotePath = "/data/local/tmp";
      var cmd = this.adbCmd + ' push "' + binPath + '" ' + remotePath;
      exec(cmd, { maxBuffer: 524288 }, function(err) {
        if (err) {
          logger.error(err);
          cb(err);
        } else {
          cb(null);
        }
      }.bind(this));
    }
  }.bind(this));
};

ADB.prototype.pushUnlock = function(cb) {
  // TODO: calling `adb install` may not be necessary if its already there.
  // can we check if app exists first? may speed this up.
  this.debug("Pushing unlock helper app to device...");
  var unlockPath = path.resolve(__dirname, "..", "build", "unlock_apk", "unlock_apk-debug.apk");
  fs.stat(unlockPath, function(err) {
    if (err) {
      cb(new Error("Could not find unlock.apk; please run " +
                   "'reset.sh --android' to build it."));
    } else {
      var cmd = this.adbCmd + ' install "' + unlockPath + '"';
      exec(cmd, { maxBuffer: 524288 }, function(err) {
        if (err) {
          logger.error(err);
          cb(err);
        } else {
          cb(null);
        }
      }.bind(this));
    }
  }.bind(this));
};

ADB.prototype.startApp = function(cb) {
  logger.info("Starting app");
  this.requireDeviceId();
  this.requireApp();
  var activityString = this.appActivity;
  var cmd = this.adbCmd + " shell am start -n " + this.appPackage + "/" +
            activityString;
  this.debug("Starting app\n" + cmd);
  exec(cmd, { maxBuffer: 524288 }, function(err, stdout) {
    if(err) {
      logger.error(err);
      cb(err);
    } else {
      if (stdout.indexOf("Error: Activity class") !== -1 &&
          stdout.indexOf("does not exist") !== -1) {
        if (this.appActivity[0] !== ".") {
          logger.info("We tried to start an activity that doesn't exist, " +
                      "retrying with . prepended to activity");
          this.appActivity = "." + this.appActivity;
          return this.startApp(cb);
        } else {
          var msg = "Activity used to start app doesn't exist! Make sure " +
                    "it exists";
          logger.error(msg);
          return cb(new Error(msg));
        }
      }

      this.waitForActivity(cb);
    }
  }.bind(this));
};

ADB.prototype.stopApp = function(cb) {
  logger.info("Killing app");
  this.requireDeviceId();
  this.requireApp();
  var cmd = this.adbCmd + " shell am force-stop " + this.appPackage;
  exec(cmd, { maxBuffer: 524288 }, function(err) {
    if (err) {
      logger.error(err);
      return cb(err);
    }
    cb();
  });
};

ADB.prototype.getFocusedPackageAndActivity = function(cb) {
  logger.info("Getting focused package and activity");
  this.requireDeviceId();
  var cmd = this.adbCmd + " shell dumpsys window windows"
    , searchRe = new RegExp(/mFocusedApp.+ ([a-zA-Z0-9\._]+)\/(\.?[^\}]+)\}/);

  exec(cmd, { maxBuffer: 524288 }, function(err, stdout) {
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
        cb(null, foundMatch[1].trim(), foundMatch[2].trim());
      } else {
        cb(new Error("Could not parse activity from dumpsys"));
      }
    }
  }.bind(this));
};

ADB.prototype.waitForNotActivity = function(cb) {
  this.requireApp();
  logger.info("Waiting for app's activity to not be focused");
  var waitMs = 20000
    , intMs = 750
    , endAt = Date.now() + waitMs
    , targetActivity = this.appWaitActivity || this.appActivity;
  if (targetActivity.indexOf(this.appPackage) === 0) {
    targetActivity = targetActivity.substring(this.appPackage.length);
  }
  var getFocusedApp = function() {
    this.getFocusedPackageAndActivity(function(err, foundPackage,
          foundActivity) {
      var notFoundAct = true;
      _.each(targetActivity.split(','), function(act) {
        act = act.trim();
        if (act === foundActivity || "." + act === foundActivity) {
          notFoundAct = false;
        }
      });
      if (foundPackage !== this.appPackage && notFoundAct) {
        cb(null);
      } else if (Date.now() < endAt) {
        if (err) logger.info(err);
        setTimeout(getFocusedApp, intMs);
      } else {
        var msg = "App never closed. appActivity: " +
                  foundActivity + " != " + targetActivity;
        logger.error(msg);
        cb(new Error(msg));
      }

    }.bind(this));
  }.bind(this);
  getFocusedApp();
};

ADB.prototype.waitForActivity = function(cb, waitMsOverride) {
  this.requireApp();
  logger.info("Waiting for app's activity to become focused");
  var waitMs = waitMsOverride || 20000
    , intMs = 750
    , endAt = Date.now() + waitMs
    , targetActivity = this.appWaitActivity || this.appActivity;
  if (targetActivity.indexOf(this.appPackage) === 0) {
    targetActivity = targetActivity.substring(this.appPackage.length);
  }
  var getFocusedApp = function() {
    this.getFocusedPackageAndActivity(function(err, foundPackage,
          foundActivity) {
      var foundAct = false;
      _.each(targetActivity.split(','), function(act) {
        act = act.trim();
        if (act === foundActivity || "." + act === foundActivity) {
          foundAct = true;
        }
      });
      if (foundPackage === this.appPackage && foundAct) {
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

    }.bind(this));
  }.bind(this);
  getFocusedApp();
};

ADB.prototype.uninstallApk = function(pkg, cb) {
  logger.info("Uninstalling " + pkg);
  var cmd = this.adbCmd + " uninstall " + pkg;
  exec(cmd, { maxBuffer: 524288 }, function(err, stdout) {
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
  logger.info("Installing " + apk);
  exec(cmd, { maxBuffer: 524288 }, function(err, stdout) {
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

ADB.prototype.removeOldApks = function(cb) {
  var listApks = function(cb) {
    var cmd = this.adbCmd + ' shell "ls /data/local/tmp/*.apk"';
    logger.info("listApks: " + cmd);
    exec(cmd, { maxBuffer: 524288 }, function(err, stdout) {
      if (err || stdout.indexOf("No such file") !== -1) {
        return cb(null, []);
      }

      var apks = stdout.split("\n");
      cb(null, apks);
    });
  }.bind(this);

  var removeOtherApks = function(apks, cb) {
    var matchingApkFound = false;
    var removeString = "";
    _.each(apks, function(path) {
      path = path.trim();
      if (path.indexOf(this.appMD5) === -1 && path !== '') {
        removeString += ' rm \\"' + path + '\\";';
        logger.info("removeOtherApks pushing: " + removeString);
      } else {
        matchingApkFound = true;
      }
    }.bind(this));

    // Invoking adb shell with an empty string will open a shell console
    // so return here if there's nothing to remove.
    if (removeString === '') {
      return cb(null, matchingApkFound);
    }

    var cmd = this.adbCmd + ' shell "' + removeString + '"';
    logger.info("removeOtherApks: " + cmd);
    exec(cmd, { maxBuffer: 524288 }, function(err, stdout) {
      if (stdout) logger.info(stdout);
      if (err) logger.info(err);
      cb(null, matchingApkFound);
    });
  }.bind(this);

  async.waterfall([
    function(cb){ listApks(cb); },
    function(apks, cb) { removeOtherApks(apks, cb); }
  ], function(err, matchingApkFound) { cb(null, matchingApkFound); });
};

// This is only invoked after checking if the app is installed.
// installAppApk will always install the apk.
ADB.prototype.installAppApk = function(apk, cb) {
  var getMD5 = function(cb) {
    fs.readFile(apk, function(err, buffer) {
      this.appMD5 = md5(buffer);
      cb(null);
    }.bind(this));
  }.bind(this);

  var adbMakeFolder = function(cb) {
    var cmd = this.adbCmd + ' shell "mkdir /data/local/tmp/"';
    logger.info("adbMakeFolder: " + cmd);
    exec(cmd, { maxBuffer: 524288 }, function(err, stdout) {
      cb(null);
    });
  }.bind(this);

  var adbPush = function(cb) {
    var cmd = this.adbCmd + ' push "' + apk + '" "/data/local/tmp/' + this.appMD5 + '.apk"';
    logger.info("adbPush: " + cmd);
    exec(cmd, { maxBuffer: 524288 }, function(err, stdout) {
      if (err) {
        logger.error(err);
        cb(err);
      } else {
        logger.debug(stdout);
        cb(null);
      }
    });
  }.bind(this);

  var adbInstall = function(cb) {
    var cmd = this.adbCmd + ' shell "pm install -r /data/local/tmp/' + this.appMD5 + '.apk"';
    logger.info("adbInstall: " + cmd);
    exec(cmd, { maxBuffer: 524288 }, function(err, stdout) {
      if (err) {
        logger.error(err);
        cb(err);
      } else {
        logger.debug(stdout);
        cb(null);
      }
    });
  }.bind(this);

  async.waterfall([
    function(cb) { adbMakeFolder(cb); },
    function(cb) { getMD5(cb); },
    function(cb) { this.removeOldApks(cb); }.bind(this),
    // If the apk is already on device, then don't push it again.
    function(matchingApkFound, cb) {
      if (matchingApkFound) { cb(null); } else { adbPush(cb); }
    },
    function(cb) {
      adbInstall(cb);
    }
  ], cb);
};

ADB.prototype.uninstallApp = function(cb) {
  var next = function() {
    this.requireDeviceId();
    this.requireApp();
    this.debug("Uninstalling app " + this.appPackage);

    this.uninstallApk(this.appPackage, function(err) {
      if (err) return cb(err);
      cb(null);
    }.bind(this));
  }.bind(this);

  if (this.skipUninstall) {
    this.debug("Not uninstalling app since server not started with " +
               "--full-reset");
    cb();
  } else {
    next();
  }
};

ADB.prototype.runFastReset = function(cb) {
  var stopApp = function(cb) {
    var cmd = this.adbCmd + ' shell am force-stop ' + this.appPackage;
    logger.info("stopApp: " + cmd);
    exec(cmd, { maxBuffer: 524288 }, function(err, stdout) {
      cb(null);
    });
  }.bind(this);

  var cleanApp = function(cb) {
    if (this.cleanApp) {
      this.debug("Cleaning the app");
      var clearCmd = this.adbCmd + " shell pm clear " + this.appPackage;
      logger.info("Running clear command: " + clearCmd);
      exec(clearCmd, { maxBuffer: 524288 }, function() {
        cb(null);
      });
    }
  }.bind(this);

  async.series([
    function(cb) { stopApp(cb); },
    function(cb) { cleanApp(cb); }
  ], cb);
};

ADB.prototype.checkAppInstallStatus = function(pkg, cb) {
  var installed = false;
  this.requireDeviceId();

  logger.debug("Getting install status for " + pkg);
  var listPkgCmd = this.adbCmd + " shell pm list packages -3 " + pkg;
  exec(listPkgCmd, { maxBuffer: 524288 }, function(err, stdout) {
    var apkInstalledRgx = new RegExp('^package:' +
        pkg.replace(/([^a-zA-Z])/g, "\\$1") + '$', 'm');
    installed = apkInstalledRgx.test(stdout);
    cb(null, installed);
  });
};

ADB.prototype.installApp = function(cb) {
  var installApp = false;
  this.requireDeviceId();

  if (this.apkPath === null) {
    logger.info("Not installing app since we launched with a package instead " +
                "of an app path");
    return cb(null);
  }

  this.requireApk();

  var determineInstallStatus = function(cb) {
    logger.info("Determining app install");
    this.checkAppInstallStatus(this.appPackage, function(err, installed) {
      installApp = !installed;
      cb();
    });
  }.bind(this);

  var doInstall = function(cb) {
    if (installApp) {
      this.debug("Installing app apk");
      this.installAppApk(this.apkPath, cb);
    } else { cb(null); }
  }.bind(this);

  var doFastReset = function(cb) {
    // App is already installed so reset it.
    if (!installApp && this.fastReset) {
      this.runFastReset(cb);
    } else { cb(null); }
  }.bind(this);

  async.series([
    function(cb) { determineInstallStatus(cb); },
    function(cb) { doInstall(cb); },
    function(cb) { doFastReset(cb); }
  ], cb);
};

ADB.prototype.back = function(cb) {
  this.requireDeviceId();
  this.debug("Pressing the BACK button");
  var cmd = this.adbCmd + " shell input keyevent 4";
  exec(cmd, { maxBuffer: 524288 }, function() {
    cb();
  });
};

ADB.prototype.goToHome = function(cb) {
  this.requireDeviceId();
  this.debug("Pressing the HOME button");
  var cmd = this.adbCmd + " shell input keyevent 3";
  exec(cmd, { maxBuffer: 524288 }, function() {
    cb();
  });
};

ADB.prototype.wakeUp = function(cb) {
  // requires an appium bootstrap connection loaded
  this.debug("Waking up device if it's not alive");
  this.android.proxy(["wake", {}], cb);
};

ADB.prototype.keyevent = function(keycode, cb) {
  this.requireDeviceId();
  var code = parseInt(keycode, 10);
  // keycode must be an int.
  var cmd = this.adbCmd + ' shell input keyevent ' + code;
  this.debug("Sending keyevent " + code);
  exec(cmd, { maxBuffer: 524288 }, function() {
    cb();
  });
};

ADB.prototype.unlockScreen = function(cb) {
  this.requireDeviceId();
  deviceState.isScreenLocked(this.adbCmd, function(err, isLocked) {
    if (err) {
      cb(err);
    } else {
      if (isLocked) {
        this.debug("Attempting to unlock screen by starting Unlock app...");
        var cmd = this.adbCmd + " shell am start -n io.appium.unlock/.Unlock";
        exec(cmd, { maxBuffer: 524288 }, function(err, stdout, stderr) {
          if (err) {
            cb(err);
          } else {
            var intervalRepeat = 200;
            var interval = function() {
              deviceState.isScreenLocked(this.adbCmd, function(err, isLocked) {
                if (err) {
                  cb(err);
                } else {
                  if (isLocked) {
                    setTimeout(interval, intervalRepeat);
                  } else {
                    cb();
                  }
                }
              });
            }.bind(this);
            setTimeout(interval, intervalRepeat);
          }
        }.bind(this));
      } else {
        this.debug('Screen already unlocked, continuing.');
        cb();
      }
    }
  }.bind(this));
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


module.exports = function(opts, android) {
  return new ADB(opts, android);
};
