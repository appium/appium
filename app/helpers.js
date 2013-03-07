"use strict";

var logger = require('../logger').get('appium')
  , fs = require('fs')
  , request = require('request')
  , path = require('path')
  , exec = require('child_process').exec
  , inTimeWarp = false
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

exports.checkSafari = function(version, cb) {
  var appPath = "/Applications/Xcode.app/Contents/Developer/Platforms" +
                "/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator" +
                version + ".sdk/Applications/MobileSafari.app";
  fs.stat(appPath, function(err, s) {
    if (err) {
      cb(err, appPath);
    } else if (!s.isDirectory()) {
      cb("App package was not a directory", appPath);
    } else {
      cb(null, appPath);
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

exports.timeWarp = function(period, warp) {
  logger.info("Starting time warp");
  period = typeof period === "undefined" ? 100 : period;
  warp = typeof warp === "undefined" ? 1000 : warp;
  var numHops = 0;
  var makeJump = function() {
    if (inTimeWarp) {
      var curMs = Date.now();
      var newDate = new Date(curMs + warp);
      var dateStr = [pad0(newDate.getHours()),
                     pad0(newDate.getMinutes()),
                     '.', pad0(newDate.getSeconds())]
                    .join('');
      exec('sudo /bin/date ' + dateStr, function(err, stdout, stderr) {
        numHops++;
        setTimeout(makeJump, period);
      });
    } else {
      var realTime = period * numHops / 1000;
      var fakeTime = (warp * numHops / 1000) + realTime;
      var info = "Moved forward " + fakeTime + " secs in " + realTime + " actual seconds";
      logger.info("Stopping time warp: " + info);
    }
  };
  inTimeWarp = true;
  makeJump();
};

exports.stopTimeWarp = function() {
  inTimeWarp = false;
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
