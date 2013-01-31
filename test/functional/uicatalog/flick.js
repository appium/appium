/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , should = require('should')
  , assert = require('assert');

describeWd('flick gesture', function(h) {
  return it('element should have new y coordinate', function(done) {
    h.driver.elementByTagName('tableCell', function(err, element) {
      element.getLocation(function(err, location) {
        h.driver.flick(0, -30, function(err) {
          should.not.exist(err);
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

describeWd("flick element", function(h) {
  return it("slider value should change", function(done) {
    h.driver.elementsByTagName("tableCell", function(err, elements) {
      elements[1].click(function(){
        h.driver.elementByTagName("slider", function(err, element) {
          element.getAttribute("value", function(err, valueBefore) {
            element.flick(-0.5, 0, 1, function() {
              element.getAttribute("value", function(err, valueAfter) {
                assert.equal(valueBefore, "50%");
                assert.equal(valueAfter, "0%");
                done();
              });
            });
          });
        });
      });
    });
  });
});
