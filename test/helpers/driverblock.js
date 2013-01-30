/*global beforeEach:true, afterEach:true, describe:true */
"use strict";

var wd = require('wd')
  , _ = require("underscore")
  , path = require("path")
  , should = require("should")
  , defaultHost = '127.0.0.1'
  , defaultPort = 4723
  , defaultCaps = {
      browserName: 'iOS'
      , platform: 'Mac'
      , version: '6.0'
      , newCommandTimeout: 60
    };

var driverBlock = function(tests, host, port, caps, extraCaps) {
  host = typeof host === "undefined" ? _.clone(defaultHost) : host;
  port = typeof port === "undefined" ? _.clone(defaultPort) : port;
  caps = typeof caps === "undefined" ? _.clone(defaultCaps) : caps;
  caps = _.extend(caps, typeof extraCaps === "undefined" ? {} : extraCaps);
  var driverHolder = {driver: null, sessionId: null};

  beforeEach(function(done) {
    driverHolder.driver = wd.remote(host, port);
    driverHolder.driver.init(caps, function(err, sessionId) {
      should.not.exist(err);
      driverHolder.sessionId = sessionId;
      done();
    });
  });

  afterEach(function(done) {
    driverHolder.driver.quit(function(err) {
      if (err && err.status && err.status.code != 6) {
        throw err;
      }
      done();
    });
  });

  tests(driverHolder);
};

var describeWithDriver = function(desc, tests, host, port, caps, extraCaps, timeout) {
  describe(desc, function() {
    if (typeof timeout !== "undefined") {
      this.timeout(timeout);
    }
    driverBlock(tests, host, port, caps, extraCaps);
  });
};

var describeForApp = function(app) {
  var appPath;
  if (/\//.exec(app)) {
    appPath = app;
  } else {
    appPath = path.resolve(__dirname, "../../sample-code/apps/" + app + "/build/Release-iphonesimulator/" + app + ".app");
  }

  return function(desc, tests, host, port, caps, extraCaps) {
    if (typeof extraCaps === "undefined") {
      extraCaps = {};
    }
    extraCaps = _.extend(extraCaps, {app: appPath});
    return describeWithDriver(desc, tests, host, port, caps, extraCaps);
  };
};

var describeForSauce = function(appUrl) {
  return function(desc, tests, host, port, extraCaps) {
    host = typeof host === "undefined" ? 'ondemand.saucelabs.com' : host;
    port = typeof port === "undefined" ? 80 : port;
    if (typeof process.env.SAUCE_USERNAME === "undefined" || typeof process.env.SAUCE_ACCESS_KEY === "undefined") {
      throw new Error("Need to set SAUCE_USERNAME and SAUCE_ACCESS_KEY");
    }
    host = process.env.SAUCE_USERNAME + ':' + process.env.SAUCE_ACCESS_KEY +
          '@' + host;
    var caps = {
      platform: "Mac 10.8"
      , device: "iPhone Simulator"
      , browserName: ""
      , app: appUrl
      , version: ""
    };

    return describeWithDriver(desc, tests, host, port, caps, extraCaps, 500000);
  };
};

module.exports.block = driverBlock;
module.exports.describe = describeWithDriver;
module.exports.describeForApp = describeForApp;
module.exports.describeForSauce = describeForSauce;
