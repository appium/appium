"use strict";

var errors = require('./errors')
  , request = require('request')
  , _ = require('underscore')
  , logger = require('../logger').get('appium')
  , exec = require('child_process').exec;

var UnknownError = errors.UnknownError
  , ProtocolError = errors.ProtocolError;


exports.respond = function(response, cb) {
  if (typeof response === 'undefined') {
    cb(null, '');
  } else {
    if (typeof(response) !== "object") {
      cb(new UnknownError(), response);
    } else if (!('status' in response)) {
      cb(new ProtocolError('Status missing in response from device'), response);
    } else {
      var status = parseInt(response.status, 10);
      if (isNaN(status)) {
        cb(new ProtocolError('Invalid status in response from device'), response);
      } else {
        response.status = status;
        cb(null, response);
      }
    }
  }
};

exports.proxy = function(command, cb) {
  // was thinking we should use a queue for commands instead of writing to a file
  logger.info('Pushing command to appium work queue: ' + JSON.stringify(command));
  this.push([command, cb]);
  if (typeof command === "object") {
    command = JSON.stringify(command);
  }
};

exports.waitForCondition = function(waitMs, condFn, cb, intervalMs) {
  if (typeof intervalMs === "undefined") {
    intervalMs = 500;
  }
  var begunAt = Date.now();
  var endAt = begunAt + waitMs;
  var me = this;
  var spin = function() {
    condFn(function(condMet) {
      var args = Array.prototype.slice.call(arguments);
      if (condMet) {
        cb.apply(me, args.slice(1));
      } else if (Date.now() < endAt) {
        setTimeout(spin, intervalMs);
      } else {
        cb.apply(me, args.slice(1));
      }
    });
  };
  spin();
};

exports.request = function(url, method, body, contentType, cb) {
  if (typeof cb === "undefined" && typeof contentType === "function") {
    cb = contentType;
    contentType = null;
  }
  if (typeof contentType === "undefined" || contentType === null) {
    contentType = "application/json";
  }
  if (!(/^https?:\/\//.exec(url))) {
    url = 'http://' + url;
  }
  var opts = {
    url: url
    , method: method
    , headers: {'Content-Type': contentType}
  };
  if (_.contains(['put', 'post', 'patch'], method.toLowerCase())) {
    if (typeof body !== "string") {
      opts.json = body;
    } else {
      opts.body = body;
    }
  }
  logger.info("Making http request with opts: " + JSON.stringify(opts));
  request(opts, cb);
};

exports.isAppInstalled = function(isInstalledCommand, cb) {
  exec(isInstalledCommand, function(error, stdout) {
    cb(error, stdout);
  });
};

exports.removeApp = function(removeCommand, udid, bundleId, cb) {
  exec(removeCommand, function(error) {
    if (error !== null) {
      cb(error, 'Unable to un-install [' + bundleId + '] from device with id [' + udid + ']. Error [' + error + ']');
    } else {
      cb(error, 'Successfully un-installed [' + bundleId + '] from device with id [' + udid + ']');
    }
  });
};

exports.installApp = function(installationCommand, udid, unzippedAppPath, cb) {
  exec(installationCommand, function(error) {
    if (error !== null) {
      cb(error, 'Unable to install [' + unzippedAppPath + '] to device with id [' + udid + ']. Error [' + error + ']');
    } else {
      cb(error, 'Successfully unzipped and installed [' + unzippedAppPath + '] to device with id [' + udid + ']');
    }
  });
};

exports.unpackApp = function(req, packageExtension, cb) {
  var reqAppPath = req.body.appPath;
  if (reqAppPath.toLowerCase().substring(0, 4) === "http") {
    req.appium.downloadAndUnzipApp(reqAppPath, function(err, appPath) {
      cb(appPath);
    });
  } else if (reqAppPath.toLowerCase().substring(reqAppPath.length - 4) === ".zip") {
    req.appium.unzipLocalApp(reqAppPath, function(err, appPath) {
      cb(appPath);
    });
  } else if (reqAppPath.toLowerCase().substring(reqAppPath.length - 4) === packageExtension) {
    cb(reqAppPath.toString());
  } else {
    cb(null);
  }
};
