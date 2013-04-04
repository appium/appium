/*global it:true */
"use strict";

var desc = require("../../helpers/driverblock.js").describeForSafari()
  , _ = require("underscore")
  //, fs = require("fs")
  , should = require('should');

//var writeImg = function(imgPath, b64Data, cb) {
  //var data = new Buffer(b64Data, 'base64').toString('binary');
  //fs.writeFile(imgPath, data, "binary", cb);
//};

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
        //writeImg("/tmp/screen1.png", screenshot, function() {
          h.driver.setOrientation("LANDSCAPE", function(err) {
            should.not.exist(err);
            h.driver.takeScreenshot(function(err, screenshot2) {
              should.not.exist(err);
              should.exist(screenshot2);
              screenshot2.should.not.eql(screenshot);
              //writeImg("/tmp/screen2.png", screenshot2, function() {
                done();
              //});
            });
          });
        //});
      });
    });
  }, null, null, {device: device + ' Simulator'});
});
