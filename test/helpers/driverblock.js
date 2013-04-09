/*global beforeEach:true, afterEach:true, describe:true */
"use strict";

var wd = require('wd')
  , _ = require("underscore")
  , sauce = require("saucelabs")
  , sauceRest = null
  , path = require("path")
  , should = require("should")
  , defaultHost = '127.0.0.1'
  , defaultPort = 4723
  , defaultCaps = {
      browserName: ''
      , device: 'iPhone Simulator'
      , platform: 'Mac'
      , version: '6.0'
      //, newCommandTimeout: 60
    };

if (process.env.SAUCE_ACCESS_KEY && process.env.SAUCE_USERNAME) {
  sauceRest = new sauce({
    username: process.env.SAUCE_USERNAME
    , password: process.env.SAUCE_ACCESS_KEY
  });
}

var driverBlock = function(tests, host, port, caps, extraCaps) {
  host = (typeof host === "undefined" || host === null) ? _.clone(defaultHost) : host;
  port = (typeof port === "undefined" || port === null) ? _.clone(defaultPort) : port;
  caps = (typeof caps === "undefined" || caps === null) ? _.clone(defaultCaps) : caps;
  caps = _.extend(caps, typeof extraCaps === "undefined" ? {} : extraCaps);
  var driverHolder = {driver: null, sessionId: null};
  var expectConnError = extraCaps && extraCaps.expectConnError;

  beforeEach(function(done) {
    driverHolder.driver = wd.remote(host, port);
    driverHolder.driver.init(caps, function(err, sessionId) {
      if (expectConnError && err) {
        driverHolder.connError = err;
        return done();
      }
      should.not.exist(err);
      driverHolder.sessionId = sessionId;
      driverHolder.driver.setImplicitWaitTimeout(5000, function(err) {
        should.not.exist(err);
        done();
      });
    });
  });

  afterEach(function(done) {
    driverHolder.driver.quit(function(err) {
      if (err && err.status && err.status.code != 6) {
        throw err;
      }
      if (host.indexOf("saucelabs") !== -1 && sauceRest !== null) {
        sauceRest.updateJob(driverHolder.sessionId, {
          passed: true
        }, function() {
          done();
        });
      } else {
        done();
      }
    });
  });

  tests(driverHolder);
};

var describeWithDriver = function(desc, tests, host, port, caps, extraCaps, timeout, onlyify) {
  var descFn;
  if (onlyify) {
    descFn = describe.only;
  } else {
    descFn = describe;
  }
  descFn(desc, function() {
    if (typeof timeout !== "undefined") {
      this.timeout(timeout);
    }
    driverBlock(tests, host, port, caps, extraCaps, onlyify);
  });
};

var describeForSafari = function() {
  var fn = function(desc, tests, host, port, extraCaps, onlyify) {
    var caps = {
      browserName: 'Safari'
      , app: 'safari'
      , device: 'iPhone Simulator'
      , platform: 'Mac'
      , version: '6.1'
    };
    return describeWithDriver(desc, tests, host, port, caps, extraCaps, undefined, onlyify);
  };
  fn.only = function() {
    var a = arguments;
    return fn(a[0], a[1], a[2], a[3], a[4], true);
  };
  return fn;
};
describeForSafari.only = function() {
  return describeForSafari(true);
};

var describeForApp = function(app, device, appPackage, appActivity) {
  if (typeof device === "undefined") {
    device = "ios";
  }
  var browserName, appPath;
  if (device === "ios") {
    browserName = "iOS";
  } else if (device === "android") {
    browserName = "Android";
  }
  if (/\//.exec(app) || /\./.exec(app)) {
    appPath = app;
  } else {
    if (device === "ios") {
      appPath = path.resolve(__dirname, "../../sample-code/apps/" + app + "/build/Release-iphonesimulator/" + app + ".app");
    } else if (device === "android") {
      appPath = path.resolve(__dirname, "../../sample-code/apps/" + app + "/bin/" + app + "-debug.apk");
    }
  }
  var realDevice = device == "ios" ? "iPhone Simulator" : "Android";

  return function(desc, tests, host, port, caps, extraCaps) {
    if (typeof extraCaps === "undefined") {
      extraCaps = {};
    }
    var newExtraCaps = {
      app: appPath,
      browserName: browserName,
      device: realDevice
    };
    if (typeof appPackage !== "undefined") {
      newExtraCaps['app-package'] = appPackage;
      newExtraCaps['app-activity'] = appActivity;
    }
    extraCaps = _.extend(extraCaps, newExtraCaps);
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
module.exports.describeForSafari = describeForSafari;
