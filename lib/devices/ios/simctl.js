"use strict";

var logger = require('../../server/logger.js').get('appium')
  , _ = require('underscore')
  , exec = require('child_process').exec
  , async = require('async');

var Simctl = function (opts) {
  var requiredOpts = [];
  _.each(requiredOpts, function (opt) {
    if (!_.has(opts, opt)) {
      throw new Error(opt + " is required");
    }
    this[opt] = opts[opt];
  }.bind(this));
};

Simctl.exec = function (cmd, timeout, args, cb) {
  if (typeof args === "function") {
    cb = args;
    args = [];
  }
  args = _.map(args, function (arg) {
    if (args.indexOf(" ") !== -1) {
      return '"' + arg + '"';
    }
    return arg;
  });
  cmd = "xcrun simctl " + cmd + " " + args.join(' ');
  logger.debug("Executing: " + cmd);
  exec(cmd, {timeout: timeout}, cb);
};

Simctl.delete = function (udid, cb) {
  Simctl.exec("delete", 0, [udid], cb);
};

Simctl.erase = function (udid, cb) {

  var erase = function (callback) {
    Simctl.exec("erase", 500, [udid], function (err, stdout, stderr) {
      if (err === null) {
        callback(null);
      } else {
        callback(err+stderr);
      }
    });
  };


  async.retry(3, erase, cb);
};

Simctl.getDevices = function (forSdk, cb) {
  if (typeof forSdk === "function") {
    cb = forSdk;
    forSdk = null;
  }
  Simctl.exec("list", 0, ["devices"], function (err, stdout) {
    if (err) return cb(err);
    var deviceSecRe = /-- iOS (.+) --(\n    .+)*/mg;
    var matches = [];
    var devices = {};
    var match = deviceSecRe.exec(stdout);
    while (match !== null) {
      matches.push(match);
      match = deviceSecRe.exec(stdout);
    }
    if (matches.length < 1) {
      return cb(new Error("Could not find device section"));
    }
    _.each(matches, function (match) {
      var sdk = match[1];
      devices[sdk] = [];
      _.each(match[0].split("\n").slice(1), function (line) {
        var lineRe = /^    (.+) \((.+)\) \((.+)\)/;
        var match = lineRe.exec(line);
        if (match === null) {
          throw new Error("Couldn't match line");
        }
        var device = {};
        device.name = match[1];
        device.udid = match[2];
        device.state = match[3];
        devices[sdk].push(device);
      });
    });
    if (forSdk) {
      if (!_.has(devices, forSdk)) {
        cb(new Error("Sdk " + forSdk + " was not in list of simctl sdks"));
      } else {
        cb(null, devices[forSdk]);
      }
    } else {
      cb(null, devices);
    }
  });
};

module.exports = Simctl;
