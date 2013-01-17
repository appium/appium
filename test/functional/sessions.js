// This is basically a port of webdriver-test.py
// https://github.com/hugs/appium/blob/master/sample-code/webdriver-test.py
/*global it:true */
"use strict";

var describeWd = require("../helpers/driverblock.js").describe
  , assert = require("assert")
  , request = require("request");

describeWd('check getSessions', function(h) {
  return it('should return appear in the sessions returned', function(done) {
    request({
        url: "http://localhost:4723/wd/hub/sessions"
        , method: "GET"
        , json: true
      }, function(err, response, body) {
        assert.equal(h.sessionId, body[0].id);
        done();
    });
  });
});
