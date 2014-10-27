"use strict";

var logger = require('./server/logger.js').get('appium')
  , fs = require('fs')
  , request = require('request')
  , _ = require('underscore')
  , path = require('path')
  , exec = require('child_process').exec
  , osType = require('os').type()
  , tempdir = require('./tempdir')
  , AdmZip = require('adm-zip');


exports.downloadFile = function (fileUrl, suffix, cb) {
  // We will be downloading the files to a directory, so make sure it's there
  // This step is not required if you have manually created the directory
  tempdir.open({prefix: 'appium-app', suffix: suffix}, function (err, info) {
    fs.close(info.fd);
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

exports.multiResolve = function (roots) {
  var args = Array.prototype.slice.call(arguments, 1);
  var paths = [];
  _.each(roots, function (root) {
    var resolveArgs = [root].concat(args);
    paths.push(path.resolve.apply(null, resolveArgs));
  });
  return paths;
};

exports.delay = function (secs) {
  var date = new Date();
  var curDate = null;
  do { curDate = new Date(); }
  while (curDate - date < (secs * 1000.0));
};

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

// return true if the the value is not undefined, null, or NaN.
exports.notNullOrUndefined = function (val) {
  var isDefined = false;

  // avoid incorrectly evaluating `0` as false
  if (_.isNumber(val)) {
    isDefined = !_.isNaN(val);
  } else {
    isDefined = !_.isUndefined(val) && !_.isNull(val);
  }

  return isDefined;
};
