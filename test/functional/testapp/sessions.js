// This is basically a port of webdriver-test.py
// https://github.com/hugs/appium/blob/master/sample-code/webdriver-test.py
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('TestApp')
  , it = require("../../helpers/driverblock.js").it
  , appiumPort = process.env.APPIUM_PORT || 4723
  , request = require("request");

describeWd('check getSessions', function(h) {
  it('should return appear in the sessions returned', function(done) {
    request({
        url: "http://localhost:" + appiumPort + "/wd/hub/sessions"
        , method: "GET"
        , json: true
      }, function(err, response, body) {
        h.driver.sessionID.should.equal(body.value[0].id);
        done();
    });
  });
});
