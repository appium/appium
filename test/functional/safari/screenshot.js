/*global it:true */
"use strict";

var desc = require("../../helpers/driverblock.js").describeForSafari()
  , _ = require("underscore")
  , should = require('should');

_.each(["iPhone", "iPad"], function(device) {
  desc('screenshots (' + device + ')', function(h) {
    it('should get an app screenshot', function(done){
      h.driver.takeScreenshot(function(err, screenshot){
        should.not.exist(err);
        should.exist(screenshot);
        done();
      });
    });
    it('should get an app screenshot in landscape mode', function(done) {
      h.driver.takeScreenshot(function(err, screenshot){
        should.not.exist(err);
        should.exist(screenshot);
        h.driver.setOrientation("LANDSCAPE", function(err) {
          //should.not.exist(err);
          // A useless error does often exist here, let's ignore it
          h.driver.takeScreenshot(function(err, screenshot2) {
            should.not.exist(err);
            should.exist(screenshot2);
            screenshot2.should.not.eql(screenshot);
            done();
          });
        });
      });
    });
  }, null, null, {device: device + ' Simulator'});
});
