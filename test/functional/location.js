/*global it:true */
"use strict";

var describeWd = require("../helpers/driverblock.js").describe
  , assert = require('assert');

describeWd('check location', function(h) {
  return it('should return the right x/y coordinates', function(done) {
    h.driver.elementByTagName('button', function(err, element) {
      assert.ok(element.value);
      element.getLocation(function(err, location) {
        assert.equal(location.x, 94);
        assert.equal(location.y, 122);
        done();
      });
    });
  });
});
