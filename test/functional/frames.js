// This is basically a port of webdriver-test.py
// https://github.com/hugs/appium/blob/master/sample-code/webdriver-test.py
/*global describe:true, it:true */
"use strict";

var driverBlock = require("../helpers/driverblock.js")
  , should = require("should");

describe('check frame command', function() {
  driverBlock(function(h) {
    return it('should actually switch frames', function(done) {
      h.driver.frame(null, function(err) {
        // TODO: make a test that proves frame switching actuall worked once we
        // move to testing with UI Catalog app
        should.not.exist(err);
        done();
      });
    });
  });
});
