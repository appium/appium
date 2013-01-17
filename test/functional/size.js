/*global it:true */
"use strict";

var describeWd = require('../helpers/driverblock.js').describe
  , assert = require('assert');

describeWd('check size', function(h) {
  return it('should return the right width and height', function(done) {
    h.driver.elementByTagName('button', function(err, element) {
      assert.deepEqual(err, null, err);
      assert.ok(element.value);
      element.getSize(function(err, size) {
        assert.deepEqual(err, null, err);
        assert.equal(size.width, 113);
        assert.equal(size.height, 37);
        done();
      });
    });
  });
});
