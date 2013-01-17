/*global describe:true, it:true */
"use strict";

var wd = require('wd')
  , assert = require('assert')
  , caps = {
      browserName: 'iOS'
      , platform: 'Mac'
      , version: '6.0'
    };

describe('get source', function() {
  var driver = wd.remote('127.0.0.1', 4723);
  return it('should return the page source', function(done) {
    driver.init(caps, function(err, sessionId) {
      driver.source(function(err, source){
        driver.quit(function() {
          assert.ok(~source.indexOf('UIAButton: "ComputeSumButton" NAME:"ComputeSumButton"'));
          done();
        });
      });
    });
  });
});
