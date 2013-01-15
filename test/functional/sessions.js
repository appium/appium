// This is basically a port of webdriver-test.py
// https://github.com/hugs/appium/blob/master/sample-code/webdriver-test.py
/*global describe:true, it:true */
"use strict";

var wd = require('wd')
  , assert = require("assert")
  , request = require("request")
  , caps = {
      browserName: 'iOS'
      , platform: 'Mac'
      , version: '6.0'
    };

describe('check getSessions', function() {
  var driver = wd.remote('127.0.0.1', 4723);
  return it('should return appear in the sessions returned', function(done) {
    driver.init(caps, function(err, sessionId) {
      request({
          url: "http://localhost:4723/wd/hub/sessions"
          , method: "GET"
          , json: true
        }, function(err, response, body) {
          assert.equal(sessionId, body[0].id);
          driver.quit(function() {
            done();
          });
      });
    });
  });
});
