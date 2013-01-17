/*global describe:true, it:true */
"use strict";

var wd = require('wd')
  , assert = require('assert')
  , caps = {
      browserName: 'iOS'
      , platform: 'Mac'
      , version: '6.0'
    };

describe('check size', function() {
  var driver = wd.remote('127.0.0.1', 4723);
  return it('should return the right width and height', function(done) {
    driver.init(caps, function(err, sessionId) {
      assert.deepEqual(err, null, err);
      driver.elementByTagName('button', function(err, element) {
        assert.deepEqual(err, null, err);
        assert.ok(element.value);
        element.getSize(function(err, size) {
          assert.deepEqual(err, null, err);
          driver.quit(function() {
            assert.equal(size.width, 113);
            assert.equal(size.height, 37);
            done();
          });
        });
      });
    });
  });
});
