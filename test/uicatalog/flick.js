/*global it:true */
"use strict";

var describeWd = require("../helpers/driverblock.js").describe
  , assert = require('assert');

describeWd('flick gesture', function(h) {
  return it('element should have new y coordinate', function(done) {
    h.driver.elementByTagName('tableCell', function(err, element) {
      element.getLocation(function(err, location) {
        h.driver.flick(0, -30, function() {
          element.getLocation(function(err, location2) {
            assert.equal(location.x, location.x);
            assert.notEqual(location.y, location2.y);
            done();
          });
        });
      });
    });
  });
});
