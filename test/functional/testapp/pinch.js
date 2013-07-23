/*global it:true */
"use strict";

var assert = require("assert")
  , describeWd = require("../../helpers/driverblock.js").describeForApp('TestApp')
  , should = require("should");

describeWd('pinchOpen and pinchClose gesture', function(h) {
  return it('should pinchOpen and pinchClose map after tapping Test Gesture', function(done) {
      var driver = h.driver;
      driver.elementsByTagName('button', function(err, buttons) {
        buttons[3].click(function(err) {
            should.not.exist(err);
            driver.elementByXPath('//window[1]/UIAMapView[1]', function(err) {
                should.not.exist(err);
                driver.execute("mobile: pinchOpen", [{startX: 114.0, startY: 198.0, endX: 257.0, endY: 256.0, duration: 5.0}], function(err) {
                    driver.elementByXPath('//window[1]/UIAMapView[1]', function(err) {
                        should.not.exist(err);
                            driver.execute("mobile: pinchClose", [{startX: 114.0, startY: 198.0, endX: 257.0, endY: 256.0, duration: 5.0}], function(err) {
                                should.not.exist(err);
                                done();
                            });
                        });
                    });
                });
            });
        });
    });
});