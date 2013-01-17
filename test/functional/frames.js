// This is basically a port of webdriver-test.py
// https://github.com/hugs/appium/blob/master/sample-code/webdriver-test.py
/*global describe:true, it:true */
"use strict";

var wd = require('wd')
  , should = require("should")
  , request = require("request")
  , caps = {
      browserName: 'iOS'
      , platform: 'Mac'
      , version: '6.0'
    };

describe('check frame command', function() {
  var driver = wd.remote('127.0.0.1', 4723);
  return it('should actually switch frames', function(done) {
    driver.init(caps, function(err, sessionId) {
      should.not.exist(err);
      driver.frame(null, function(err) {
        // TODO: make a test that proves frame switching actuall worked once we
        // move to testing with UI Catalog app
        driver.quit(function() {
          should.not.exist(err);
          done();
        });
      });
    });
  });
});
