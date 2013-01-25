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

var describeWithDriver = function(desc, tests, host, port, caps, extraCaps) {
  describe(desc, function() {
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

module.exports.block = driverBlock;
module.exports.describe = describeWithDriver;
module.exports.describeForApp = describeForApp;
