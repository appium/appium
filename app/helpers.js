"use strict";

var logger = require('../logger').get('appium')
  , url = require('url')
  , fs = require('fs')
  , path = require('path')
  , exec = require('child_process').exec
  , http = require('http')
  , temp = require('temp');

exports.downloadFile = function(fileUrl, cb) {
  // We will be downloading the files to a directory, so make sure it's there
  // This step is not required if you have manually created the directory
  temp.open({prefix: 'appium-app', suffix: '.zip'}, function(err, info) {
    var options = {
      host: url.parse(fileUrl).host,
      port: 80,
      path: url.parse(fileUrl).pathname
    };
    var file = fs.createWriteStream(info.path);
    http.get(options, function(res) {
      res.on('data', function(data) {
        file.write(data);
      }).on('end', function() {
        file.end();
        logger.info(fileUrl + ' downloaded to ' + info.path);
        cb(info.path);
      });
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

exports.unzipApp = function(zipPath, cb) {
  exports.unzipFile(zipPath, function(err, output) {
    if (!err) {
      var match = /inflating: ([^\/]+\.app)\//.exec(output);
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
