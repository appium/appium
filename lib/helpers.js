"use strict";

var logger = require('./server/logger.js').get('appium')
  , fs = require('fs')
  , ncp = require('ncp').ncp
  , request = require('request')
  , _ = require('underscore')
  , path = require('path')
  , rimraf = require('rimraf')
  , exec = require('child_process').exec
  , osType = require('os').type()
  , tempdir = require('./tempdir')
  , glob = require('glob')
  , AdmZip = require('adm-zip');


exports.downloadFile = function (fileUrl, suffix, cb) {
  // We will be downloading the files to a directory, so make sure it's there
  // This step is not required if you have manually created the directory
  tempdir.open({prefix: 'appium-app', suffix: suffix}, function (err, info) {
    var file = fs.createWriteStream(info.path);
    request(fileUrl).pipe(file).on('close', function () {
      logger.debug(fileUrl + ' downloaded to ' + info.path);
      cb(info.path);
    });
  });
};

exports.copyLocalZip = function (localZipPath, cb) {
  logger.debug("Copying local zip to tmp dir");
  fs.stat(localZipPath, function (err) {
    if (err) return cb(err);
    tempdir.open({prefix: 'appium-app', suffix: '.zip'}, function (err, info) {
      var infile = fs.createReadStream(localZipPath);
      var outfile = fs.createWriteStream(info.path);
      infile.pipe(outfile).on('close', function () {
        logger.debug(localZipPath + ' copied to ' + info.path);
        cb(null, info.path);
      });
    });
  });
};

exports.unzipFile = function (zipPath, cb) {
  logger.debug("Unzipping " + zipPath);
  exports.testZipArchive(zipPath, function (err, valid) {
    if (valid) {
      if (exports.isWindows()) {
        var zip = new AdmZip(zipPath);
        zip.extractAllTo(path.dirname(zipPath), true);
        logger.debug("Unzip successful");
        cb(null, null);
      } else {
        var execEnv = _.clone(process.env);
        delete execEnv.UNZIP;
        var execOpts = {cwd: path.dirname(zipPath), maxBuffer: 524288,
                        env: execEnv};
        exec('unzip -o ' + zipPath, execOpts, function (err, stderr, stdout) {
          if (!err) {
            logger.debug("Unzip successful");
            cb(null, stderr);
          } else {
            logger.error("Unzip threw error " + err);
            logger.error("Stderr: " + stderr);
            logger.error("Stdout: " + stdout);
            cb("Archive could not be unzipped, check appium logs.", null);
          }
        });
      }
    } else {
      cb(err, null);
    }
  });
};

exports.testZipArchive = function (zipPath, cb) {
  logger.debug("Testing zip archive: " + zipPath);
  if (exports.isWindows()) {
    if (fs.existsSync(zipPath)) {
      logger.debug("Zip archive tested clean");
      cb(null, true);
    } else {
      cb("Zip archive was not found.", false);
    }
  } else {
    var execEnv = _.clone(process.env);
    delete execEnv.UNZIP;
    var execOpts = {cwd: path.dirname(zipPath), maxBuffer: 524288,
                    env: execEnv};
    exec("unzip -tq " + zipPath, execOpts, function (err, stderr, stdout) {
      if (!err) {
        if (/No errors detected/.exec(stderr)) {
          logger.debug("Zip archive tested clean");
          cb(null, true);
        } else {
          logger.error("Zip file " + zipPath + " was not valid");
          logger.error("Stderr: " + stderr);
          logger.error("Stdout: " + stdout);
          cb("Zip archive did not test successfully, check appium server logs " +
             "for output", false);
        }
      } else {
        logger.error("Test zip archive threw error " + err);
        logger.error("Stderr: " + stderr);
        logger.error("Stdout: " + stdout);
        cb("Error testing zip archive, are you sure this is a zip file? " + err, null);
      }
    });
  }
};

exports.unzipApp = function (zipPath, appExt, cb) {
  exec("find " + path.dirname(zipPath) + " -type d -name '*" + appExt + "' | xargs rm -rf " + path.dirname(zipPath) +
    "/Payload*", function (error /*, stdout, stderr*/) {
    if (!error) {
      exports.unzipFile(zipPath, function (err, output) {
        if (!err) {
          var relaxedRegStr = "(?:creating|inflating|extracting): (.+" + appExt + ")/?";
          // in the strict regex, we check for an entry which ends with the
          // extension
          var strictReg = new RegExp(relaxedRegStr + "$", 'm');
          // otherwise, we allow an entry which contains the extension, but we
          // need to be careful, because it might be a false positive
          var relaxedReg = new RegExp(relaxedRegStr, 'm');
          var strictMatch = strictReg.exec(output);
          var relaxedMatch = relaxedReg.exec(output);
          var getAppPath = function (match) {
            return path.resolve(path.dirname(zipPath), match[1]);
          };
          if (strictMatch) {
            cb(null, getAppPath(strictMatch));
          } else if (relaxedMatch) {
            logger.debug("Got a relaxed match for app in zip, be careful for app match errors");
            cb(null, getAppPath(relaxedMatch));
          } else {
            cb("App zip unzipped OK, but we couldn't find a .app bundle in it. " +
              "Make sure your archive contains the .app package and nothing else",
              null);
          }
        } else {
          cb(err, null);
        }
      });
    } else {
      cb(error, null);
    }
  });
};

exports.checkBuiltInApp = function (appName, version, tmpDir, cb) {
  logger.debug("Looking for built in app " + appName);
  var newAppDir = path.resolve(tmpDir, 'Appium-' + appName + '.app');
  var checkApp = function (s, appPath, cb) {
    if (!s.isDirectory()) {
      cb(new Error("App package was not a directory"), appPath);
      return false;
    }
    return true;
  };
  exports.getBuiltInAppDir(version, function (err, appDir) {
    if (err) return cb(err);
    var appPath = path.resolve(appDir, appName + ".app");
    fs.stat(appPath, function (err, s) {
      if (err && err.message.indexOf("ENOENT") !== -1) {
        logger.debug("App is not at " + appPath);
        fs.stat(newAppDir, function (err, s) {
          if (err) {
            logger.warn("App is also not at " + newAppDir);
            return cb(new Error("Couldn't find built in app in its home " +
                                "or temp dir!"));
          }
          if (checkApp(s, appPath, cb)) {
            logger.debug("Couldn't find original app, but found the temp " +
                        "Appium one so using that");
            cb(null, newAppDir, appPath);
          }
        });
        return;
      } else if (err) {
        return cb(err);
      }
      if (checkApp(s, appPath, cb)) {
        if (parseInt(version, 10) < 7) {
          logger.debug("Got app, trying to copy " + appPath + " to tmp dir");
          ncp(appPath, newAppDir, function (err) {
            if (err) return cb(err);
            logger.debug("Copied " + appName);
            cb(null, newAppDir, null);
          });
        } else {
          logger.debug("Got app, trying to move " + appPath + " to tmp dir");
          exports.moveBuiltInApp(appPath, appName, newAppDir, cb);
        }
      }
    });
  });
};

exports.checkSafari = function (version, tmpDir, cb) {
  exports.checkBuiltInApp("MobileSafari", version, tmpDir, cb);
};

exports.checkPreferencesApp = function (version, tmpDir, cb) {
  exports.checkBuiltInApp("Preferences", version, tmpDir, cb);
};

exports.getBuiltInAppDir = function (version, cb) {
  exports.getXcodeFolder(function (err, xcodeDir) {
    if (err) return cb(err);

    var appDir = path.resolve(xcodeDir, "Platforms/iPhoneSimulator.platform/" +
                              "Developer/SDKs/iPhoneSimulator" + version +
                              ".sdk/Applications/");
    fs.stat(appDir, function (err, s) {
      if (err) {
        cb(err);
      } else if (!s.isDirectory()) {
        cb(new Error("Could not load built in applications directory"));
      } else {
        cb(null, appDir);
      }
    });
  });
};

exports.moveBuiltInApp = function (appPath, appName, newAppDir, cb) {
  ncp(appPath, newAppDir, function (err) {
    if (err) return cb(err);
    logger.debug("Copied " + appName + " to " + newAppDir);
    rimraf(appPath, function (err) {
      if (err) {
        if (err.message.indexOf("EACCES") !== -1) {
          return cb(new Error("We don't have write access to " + appPath +
                    ", please re-run authorize as " + process.env.USER));
        }
        return cb(err);
      }
      logger.debug("Temporarily deleted original app at " + appPath);
      cb(null, newAppDir, appPath);
    });
  });
};

exports.cleanSafari = function (safariVer, cb) {
  var baseDir = "Library/Application Support/iPhone Simulator/" +
                       safariVer + "*/Library/";
  exports.getUser(function (err, user) {
    if (err) {
      logger.error(err);
      cb(err);
    } else {
      var baseSupportDirs = path.resolve("/Users", user, baseDir);
      glob(baseSupportDirs, function (err, pathList) {
        if (err) return cb(err);
        if (pathList.length === 0) {
          logger.debug("Couldn't find Safari support directories in order " +
                      "to clear out old data");
          return cb();
        }
        var pathsFinished = 0;
        var errToRet = null;
        var finishAll = function (err) {
          if (err) errToRet = err;
          pathsFinished++;
          if (pathsFinished === pathList.length) {
            cb(err);
          }
        };
        _.each(pathList, function (baseSupportDir) {
          var toDeletes = [
            'Caches/Snapshots/com.apple.mobilesafari'
            , 'Caches/com.apple.mobilesafari/Cache.db*'
            , 'Caches/com.apple.WebAppCache/*.db'
            , 'Safari/*.plist'
            , 'WebKit/LocalStorage/*.*'
            , 'Library/WebKit/GeolocationSites.plist'
            , 'Cookies/*.binarycookies'
          ];
          var deletes = 0;
          var errToRet = null;
          var finishOne = function (err) {
            deletes++;
            if (err) {
              errToRet = err;
            }
            if (deletes === toDeletes.length) {
              finishAll(errToRet);
            }
          };
          _.each(toDeletes, function (del) {
            var toDelete = path.resolve(baseSupportDir, del);
            toDelete = toDelete.replace(/ /g, "\\ ");
            logger.debug("Deleting " + toDelete);
            var cmd = "rm -rf " + toDelete;
            exec(cmd, function (err) {
              finishOne(err);
            });
          });
        });
      });
    }
  });
};

exports.getUser = function (cb) {
  logger.debug("Determining current user");
  exec("whoami", { maxBuffer: 524288 }, function (err, stdout) {
    if (err) {
      logger.error(err);
      cb(err);
    } else {
      logger.debug("User is " + stdout.trim());
      cb(null, stdout.trim());
    }
  });
};

exports.delay = function (secs) {
  var date = new Date();
  var curDate = null;
  do { curDate = new Date(); }
  while (curDate - date < (secs * 1000.0));
};

// var pad0 = function (x) {
//   if (x.toString().length == 1) {
//     x = '0' + x;
//   }
//   return x;
// };

exports.escapeSpecialChars = function (str, quoteEscape) {
  if (typeof str !== "string") {
    return str;
  }
  if (typeof quoteEscape === "undefined") {
    quoteEscape = false;
  }
  str = str
        .replace(/[\\]/g, '\\\\')
        .replace(/[\/]/g, '\\/')
        .replace(/[\b]/g, '\\b')
        .replace(/[\f]/g, '\\f')
        .replace(/[\n]/g, '\\n')
        .replace(/[\r]/g, '\\r')
        .replace(/[\t]/g, '\\t')
        .replace(/[\"]/g, '\\"')
        .replace(/\\'/g, "\\'");
  if (quoteEscape) {
    var re = new RegExp(quoteEscape, "g");
    str = str.replace(re, "\\" + quoteEscape);
  }
  return str;
};

exports.parseWebCookies = function (cookieStr) {
  var cookies = [];
  var splits = cookieStr.trim().split(";");
  _.each(splits, function (split) {
    split = split.trim();
    if (split !== "") {
      split = split.split("=");
      cookies.push({
        name: decodeURIComponent(split[0])
      , value: decodeURIComponent(split[1])
      });
    }
  });
  return cookies;
};

var warningsEmitted = {};
var deprecationWarnings = [];

var warningText = _.template(
  "[DEPRECATED] The <%= deprecated %> <%= kind %> has been deprecated and will " +
  "be removed."
);

var replacementText = _.template(
  "  Please use the <%= replacement %> <%= kind %> instead."
);

exports.formatDeprecationWarning = function (kind, deprecated, replacement) {
  var warning = warningText({kind: kind, deprecated: deprecated});
  if (typeof replacement !== 'undefined') {
    warning += replacementText({kind: kind, replacement: replacement});
  }
  return warning;
};

exports.logDeprecationWarning = function (kind, deprecated, replacement) {
  if (!_.has(warningsEmitted, kind)) {
    warningsEmitted[kind] = {};
  }
  if (!_.has(warningsEmitted[kind], deprecated)) {
    var warning = exports.formatDeprecationWarning(kind, deprecated, replacement);
    deprecationWarnings.push(warning);
    logger.warn(warning);
    warningsEmitted[kind][deprecated] = true;
  }
};

exports.logCustomDeprecationWarning = function (kind, deprecated, msg) {
  if (!_.has(warningsEmitted, kind)) {
    warningsEmitted[kind] = {};
  }
  if (!_.has(warningsEmitted[kind], deprecated)) {
    deprecationWarnings.push(msg);
    logger.warn(msg);
    warningsEmitted[kind][deprecated] = true;
  }
};

exports.logFinalDeprecationWarning = function () {
  var numWarnings = deprecationWarnings.length;
  if (numWarnings > 0) {
    logger.warn("[DEPRECATED] You used " + numWarnings + " deprecated" +
                " capabilities during this session.  Please check the logs" +
                " as they will be removed in a future version of Appium.");
  }
};

exports.getDeprecationWarnings = function () {
  return deprecationWarnings;
};

exports.clearWarnings = function () {
  warningsEmitted = {};
  deprecationWarnings = [];
};

exports.rotateImage = function (imgPath, deg, cb) {
  logger.debug("Rotating image " + imgPath + " " + deg + " degrees");
  var scriptPath = require('appium-uiauto').rotate;
  var cmd = "osascript " + scriptPath + " " + JSON.stringify(imgPath) +
            " " + deg;
  exec(cmd, { maxBuffer: 524288 }, function (err, stdout) {
    if (err) return cb(err);
    console.log(stdout);
    cb(null);
  });
};

exports.isWindows = function () {
  return osType === 'Windows_NT';
};

exports.isMac = function () {
  return osType === 'Darwin';
};

exports.isLinux = function () {
  return !exports.isWindows() && !exports.isMac();
};

exports.macVersionArray = function (cb) {
  var versions = [];
  if (exports.isMac()) {
    exec("sw_vers -productVersion", function (err, stdout) {
      if (err) return cb(err);
      stdout = stdout.trim();
      if (/\d+\.\d+\.\d+/.test(stdout)) {
        _.each(stdout.split("."), function (ver) {
          versions.push(parseInt(ver, 10));
        });
        cb(null, versions);
      } else {
        cb(new Error("Could not parse version information from: " + stdout));
      }
    });
  } else {
    cb(null, versions);
  }
};

exports.getGitRev = function (cb) {
  var cwd = path.resolve(__dirname, "..");
  exec("git rev-parse HEAD", {cwd: cwd, maxBuffer: 524288}, function (err, stdout) {
    if (err) return cb(err);
    cb(null, stdout.trim());
  });
};

exports.getXcodeFolder = function (cb) {
  exec('xcode-select --print-path', { maxBuffer: 524288, timeout: 3000 }, function (err, stdout, stderr) {
    if (!err) {
      var xcodeFolderPath = stdout.replace("\n", "");
      if (fs.existsSync(xcodeFolderPath)) {
        cb(null, xcodeFolderPath);
      } else {
        logger.error(xcodeFolderPath + "does not exist.");
        cb(new Error("xcode-select could not find xcode"), null);
      }
    } else {
      logger.error("xcode-select threw error " + err);
      logger.error("Stderr: " + stderr);
      logger.error("Stdout: " + stdout);
      cb(new Error("xcode-select threw an error"), null);
    }
  });
};

exports.getXcodeVersion = function (cb) {
  exports.getXcodeFolder(function (err, xcodePath) {
    if (err  !== null) {
      cb(err, null);
    } else {
      var xcodebuildPath = path.resolve(xcodePath, "usr/bin/xcodebuild");
      if (!fs.existsSync(xcodebuildPath)) {
        cb(new Error("Could not get Xcode version: " + xcodebuildPath + " does not exist on disk."), null);
      } else {
        exec(JSON.stringify(xcodebuildPath) + ' -version', { maxBuffer: 524288, timeout: 3000 }, function (err, stdout) {
          var versionPattern = /\d\.\d\.*\d*/;
          var match = versionPattern.exec(stdout);
          if (match === null) {
            cb(new Error("Could not parse Xcode version (xcodebuild output was: " + stdout + ")"), null);
          } else {
            var versionNumber = match[0];
            cb(null, versionNumber);
          }
        });
      }
    }
  });
};

exports.getiOSSDKVersion = function (cb) {
  var msg;
  exports.getXcodeVersion(function (err, versionNumber) {
    if (err) {
      msg = "Could not get the iOS SDK version because the Xcode version could not be determined.";
      logger.error(msg);
      cb(new Error(msg), null);
    } else if (versionNumber[0] === '4') {
      cb(null, '6.1');
    } else {
      exec('xcrun --sdk iphonesimulator --show-sdk-version', { maxBuffer: 524288, timeout: 3000 }, function (err, stdout, stderr) {
        if (!err) {
          var iosSDKVersion = stdout.replace("\n", "");
          var match = /\d.\d/.exec(iosSDKVersion);
          if (match) {
            cb(null, iosSDKVersion);
          } else {
            msg = "xcrun returned a non-numeric iOS SDK version: " + iosSDKVersion;
            logger.error(msg);
            cb(new Error(msg), null);
          }
        } else {
          msg = "xcrun threw an error " + err;
          logger.error(msg);
          logger.error("Stderr: " + stderr);
          logger.error("Stdout: " + stdout);
          cb(new Error(msg), null);
        }
      });
    }
  });
};

exports.getAppiumConfig = function () {
  var configPath = path.resolve(__dirname, "..", ".appiumconfig.json");
  var config
    , msg;
  try {
    config = require(configPath);
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND") {
      msg = "Could not find config file: " + configPath +
                 "; looks like config hasn't been run." +
                 " Please run reset.sh or appium configure.";
      logger.error(msg);
      throw new Error(msg);
    } else {
      msg = "Invalid config file at " + configPath +
                " please re-run reset.sh or appium config";
      logger.error(msg);
      throw new Error(msg);
    }
  }

  return config;
};

exports.iosConfigured = function () {
  return typeof exports.getAppiumConfig().ios !== "undefined";
};

exports.truncateDecimals = function (number, digits) {
  var multiplier = Math.pow(10, digits),
      adjustedNum = number * multiplier,
      truncatedNum = Math[adjustedNum < 0 ? 'ceil' : 'floor'](adjustedNum);

  return truncatedNum / multiplier;
};
