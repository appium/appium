/*global beforeEach:true, afterEach:true, describe:true */
"use strict";

var wd = require('wd')
  , defaultHost = '127.0.0.1'
  , defaultPort = 4723
  , defaultCaps = {
      browserName: 'iOS'
      , platform: 'Mac'
      , version: '6.0'
    };

var driverBlock = function(tests, host, port, caps) {
  host = typeof host === "undefined" ? defaultHost : host;
  port = typeof port === "undefined" ? defaultPort : port;
  caps = typeof caps === "undefined" ? defaultCaps : caps;
  var driverHolder = {driver: null, sessionId: null};

  beforeEach(function(done) {
    driverHolder.driver = wd.remote(host, port);
    driverHolder.driver.init(caps, function(err, sessionId) {
      driverHolder.sessionId = sessionId;
      done();
    });
  });

  afterEach(function(done) {
    driverHolder.driver.quit(done);
  });

  tests(driverHolder);
};

var describeWithDriver = function(desc, tests, host, port, caps) {
  describe(desc, function() {
    driverBlock(tests, host, port, caps);
  });
};

module.exports.block = driverBlock;
module.exports.describe = describeWithDriver;
