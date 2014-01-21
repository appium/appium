// This is basically a port of webdriver-test.py
// https://github.com/hugs/appium/blob/master/sample-code/webdriver-test.py
"use strict";

var env = require('../../helpers/env')
  , setup = require('./setup')
  , request = require("request");

describe('check getSessions', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it('should return appear in the sessions returned', function(done) {
    request({
        url: "http://localhost:" + env.APPIUM_PORT + "/wd/hub/sessions"
        , method: "GET"
        , json: true
      }, function(err, response, body) {
        browser.sessionID.should.equal(body.value[0].id);
        done();
    });
  });
});
