/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , should = require('should')
  , assert = require('assert');

describeWd('flick gesture', function(h) {
  it('should work via webdriver method', function(done) {
    h.driver.elementByTagName('tableCell', function(err, element) {
      element.getLocation(function(err, location) {
        h.driver.flick(0, -100, false, function(err) {
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
  it('should work via mobile only method', function(done) {
    h.driver.elementByTagName('tableCell', function(err, element) {
      element.getLocation(function(err, location) {
        h.driver.execute("mobile: flick", [{endX: 0, endY: 0}], function(err) {
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
  it('should work via mobile only method with percentage', function(done) {
    h.driver.elementByTagName('tableCell', function(err, element) {
      element.getLocation(function(err, location) {
        var opts = {startX: 0.75, startY: 0.75, endX: 0.25, endY: 0.25};
        h.driver.execute("mobile: flick", [opts], function(err) {
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

describeWd('swipe gesture', function(h) {
  it('element should have new y coordinate', function(done) {
    h.driver.elementByTagName('tableCell', function(err, element) {
      element.getLocation(function(err, location) {
        h.driver.flick(0, -100, true, function(err) {
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
  it('should also work with percentage units', function(done) {
    h.driver.elementByTagName('tableCell', function(err, element) {
      element.getLocation(function(err, location) {
        h.driver.flick(0, -0.5, true, function(err) {
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
  it("slider value should change", function(done) {
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
  it("should work with mobile flick", function(done) {
    h.driver.elementsByTagName("tableCell", function(err, elements) {
      elements[1].click(function(){
        h.driver.elementByTagName("slider", function(err, element) {
          element.getAttribute("value", function(err, valueBefore) {
            var opts = {elementId: element.value, endX: -50, endY: 0};
            h.driver.execute("mobile: flick", [opts], function() {
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
  it("should work with mobile flick and percent", function(done) {
    h.driver.elementsByTagName("tableCell", function(err, elements) {
      elements[1].click(function(){
        h.driver.elementByTagName("slider", function(err, element) {
          element.getAttribute("value", function(err, valueBefore) {
            var opts = {elementId: element.value, startX: 0.5, startY: 0.0,
              endX: 0.0, endY: 0.0};
            h.driver.execute("mobile: flick", [opts], function() {
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
