/*global describe:true, it:true */
"use strict";

var wd = require('wd')
  , assert = require('assert')
  , caps = {
      browserName: 'iOS'
      , platform: 'Mac'
      , version: '6.0'
    };

describe('check location', function() {
  var driver = wd.remote('127.0.0.1', 4723);
  return it('should return the right x/y coordinates', function(done) {
    driver.init(caps, function(err, sessionId) {
      driver.elementByTagName('button', function(err, element) {
        assert.ok(element.value);
        element.location(function(err, location) {
          assert.equal(location.x, 94);
          assert.equal(location.y, 122);
          driver.quit(function() {
            done();
          });
        });
      });
    });
  });
});
