// This is basically a port of webdriver-test.py
// https://github.com/hugs/appium/blob/master/sample-code/webdriver-test.py
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('TestApp')
  , it = require("../../helpers/driverblock.js").it
  , assert = require("assert")
  , appiumPort = process.env.APPIUM_PORT || 4723
  , request = require("request");

describeWd('check getSessions', function(h) {
  return it('should return appear in the sessions returned', function(done) {
    request({
        url: "http://localhost:" + appiumPort + "/wd/hub/sessions"
        , method: "GET"
        , json: true
      }, function(err, response, body) {
        assert.equal(h.sessionId, body.value[0].id);
        done();
    });
  });
});
