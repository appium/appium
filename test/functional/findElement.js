/*global describe:true, it:true */
"use strict";

var wd = require('wd')
  , assert = require('assert')
  , caps = {
      browserName: 'iOS'
      , platform: 'Mac'
      , version: '6.0'
    };

describe('check findElement', function() {
  var driver = wd.remote('127.0.0.1', 4723);
  return it('should find a single element on the app', function(done) {
    driver.init(caps, function(err, sessionId) {
      driver.elementByTagName('button', function(err, element) {
        assert.ok(element.value);
        driver.quit(function() {
          done();
        });
      });
    });
  });
});

describe('check findElements', function() {
  var driver = wd.remote('127.0.0.1', 4723);
  return it('should find both elements on the app', function(done) {
    driver.init(caps, function(err, sessionId) {
      driver.elementsByTagName('button', function(err, elements) {
        assert.equal(elements.length, 2);
        assert.ok(elements[0].value);
        driver.quit(function() {
          done();
        });
      });
    });
  });
});
