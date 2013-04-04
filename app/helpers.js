"use strict";

var logger = require('../logger').get('appium')
  , fs = require('fs')
  , ncp = require('ncp').ncp
  , request = require('request')
  , _ = require('underscore')
  , path = require('path')
  , rimraf = require('rimraf')
  , exec = require('child_process').exec
  , temp = require('temp');

exports.downloadFile = function(fileUrl, cb) {
  // We will be downloading the files to a directory, so make sure it's there
  // This step is not required if you have manually created the directory
  temp.open({prefix: 'appium-app', suffix: '.zip'}, function(err, info) {
    var file = fs.createWriteStream(info.path);
    request(fileUrl).pipe(file).on('close', function() {
      logger.info(fileUrl + ' downloaded to ' + info.path);
      cb(info.path);
    });
  });
};

exports.copyLocalZip = function(localZipPath, cb) {
  temp.open({prefix: 'appium-app', suffix: '.zip'}, function(err, info) {
    var infile = fs.createReadStream(localZipPath);
    var outfile = fs.createWriteStream(info.path);
    infile.pipe(outfile).on('close', function() {
      logger.info(localZipPath + ' copied to ' + info.path);
      cb(info.path);
    });
  });
};

exports.unzipFile = function(zipPath, cb) {
  logger.info("Unzipping " + zipPath);
  var execOpts = {cwd: path.dirname(zipPath)};
  exports.testZipArchive(zipPath, function(err, valid) {
    if (valid) {
      exec('unzip -o ' + zipPath, execOpts, function(err, stderr, stdout) {
        if (!err) {
          logger.info("Unzip successful");
          cb(null, stderr);
        } else {
          logger.error("Unzip threw error " + err);
          logger.error("Stderr: " + stderr);
          logger.error("Stdout: " + stdout);
          cb("Archive could not be unzipped, check appium logs.", null);
        }
      });
    } else {
      cb(err, null);
    }
  });
};

exports.testZipArchive = function(zipPath, cb) {
  logger.info("Testing zip archive: " + zipPath);
  var execOpts = {cwd: path.dirname(zipPath)};
  exec("unzip -t " + zipPath, execOpts, function(err, stderr, stdout) {
    if (!err) {
      if(/No errors detected/.exec(stderr)) {
        logger.info("Zip archive tested clean");
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
      cb("Error testing zip archive, are you sure this is a zip file?", null);
    }
  });
};

exports.unzipApp = function(zipPath, appExt, cb) {
  exports.unzipFile(zipPath, function(err, output) {
    if (!err) {
      var reg = new RegExp("inflating: (.+" + appExt + ")/?");
      var match = reg.exec(output);
      if (match) {
        var appPath = path.resolve(path.dirname(zipPath), match[1]);
        cb(null, appPath);
      } else {
        cb("App zip unzipped OK, but we couldn't find a .app bundle in it. " +
           "Make sure your archive contains the .app package and nothing else",
           null);
      }
    } else {
      cb(err, null);
    }
  });
};

exports.checkBuiltInApp = function(appName, version, cb) {
  logger.info("Looking for built in app " + appName);
  exports.getBuiltInAppDir(version, function(err, appDir) {
    if (err) {
      cb(err);
    } else {
      var appPath = path.resolve(appDir, appName + ".app");
      fs.stat(appPath, function(err, s) {
        if (err) {
          cb(err, appPath);
        } else if (!s.isDirectory()) {
          cb("App package was not a directory", appPath);
        } else {
          logger.info("Got app, trying to copy to tmp dir");
          exports.copyBuiltInApp(appPath, appName, cb);
        }
      });
    }
  });
};

exports.checkSafari = function(version, cb) {
  exports.checkBuiltInApp("MobileSafari", version, cb);
};

exports.checkPreferencesApp = function(version, cb) {
  exports.checkBuiltInApp("Preferences", version, cb);
};

exports.getBuiltInAppDir = function(version, cb) {
  var appDir = "/Applications/Xcode.app/Contents/Developer/Platforms" +
               "/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator" +
               version + ".sdk/Applications/";
  fs.stat(appDir, function(err, s) {
    if (err) {
      cb(err);
    } else if (!s.isDirectory()) {
      cb("Could not load built in applications directory");
    } else {
      cb(null, appDir);
    }
  });
};

exports.copyBuiltInApp = function(appPath, appName, cb) {
  var newAppDir = path.resolve('/tmp/Appium-' + appName + '.app');
  ncp(appPath, newAppDir, function(err) {
    if (err) {
      cb(err);
    } else {
      logger.info("Copied " + appName + " to " + newAppDir);
      cb(null, newAppDir);
    }
  });
};

exports.cleanSafari = function(safariVer, cb) {
  var baseSupportDir = "Library/Application Support/iPhone Simulator/" +
                       safariVer + "/Library/";
  exports.getUser(function(err, user) {
    if (err) {
      cb(err);
    } else {
      baseSupportDir = path.resolve("/Users", user, baseSupportDir);
      fs.stat(baseSupportDir, function(err) {
        if (err) {
          logger.info(err.message);
          cb(new Error("Could not find support directory for mobile safari, does " +
                       "it exist at " + baseSupportDir + "?"));
        } else {
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
          var finish = function(err) {
            deletes++;
            if (err) {
              errToRet = err;
            }
            if (deletes === toDeletes.length) {
              cb(errToRet);
            }
          };
          _.each(toDeletes, function(del) {
            var toDelete = path.resolve(baseSupportDir, del);
            toDelete = toDelete.replace(/ /g, "\\ ");
            logger.info("Deleting " + toDelete);
            var cmd = "rm -rf " + toDelete;
            exec(cmd, function(err) {
              finish(err);
            });
          });
        }
      });
    }
  });
};

exports.getUser = function(cb) {
  exec("whoami", function(err, stdout) {
    if (err) {
      cb(err);
    } else {
      cb(null, stdout.trim());
    }
  });
};

exports.delay = function(secs) {
  var date = new Date();
  var curDate = null;
  do { curDate = new Date(); }
  while(curDate-date < (secs * 1000.0));
};

var pad0 = function(x) {
  if (x.toString().length == 1) {
    x = '0' + x;
  }
  return x;
};

exports.escapeSpecialChars = function(str, quoteEscape) {
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

exports.parseWebCookies = function(cookieStr) {
  var cookies = [];
  var splits = cookieStr.trim().split(";");
  _.each(splits, function(split) {
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

exports.rotateImage = function(imgPath, deg, cb) {
  logger.info("Rotating image " + imgPath + " " + deg + " degrees");
  var scriptPath = path.resolve(__dirname, "uiauto/Rotate.applescript");
  var cmd = "osascript " + scriptPath + " " + JSON.stringify(imgPath) +
            " " + deg;
  exec(cmd, function(err, stdout) {
    if (err) return cb(err);
    console.log(stdout);
    cb(null);
  });
};
