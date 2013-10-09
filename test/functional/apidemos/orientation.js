"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = ".ApiDemos"
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath,
      "android", appPkg, appAct)
  , it = require("../../helpers/driverblock.js").it
  , should = require('should');

describeWd('orientation', function(h) {
  it('should rotate screen to landscape', function(done) {
    h.driver.setOrientation("LANDSCAPE", function(err) {
      should.not.exist(err);
      var next = function() {
        h.driver.getOrientation(function(err, orientation) {
          orientation.should.equal("LANDSCAPE");
          done();
        });
      };
      setTimeout(next, 3000);
    });
  });
  it('should rotate screen to portrait', function(done) {
    h.driver.setOrientation("LANDSCAPE", function(err) {
      var next = function() {
        h.driver.setOrientation("PORTRAIT", function(err) {
          var next = function() {
            h.driver.getOrientation(function(err, orientation) {
              orientation.should.equal("PORTRAIT");
              done();
            });
          };
          setTimeout(next, 3000);
        });
      };
      setTimeout(next, 3000);
    });
  });
  it('Should not error when trying to rotate to portrait again', function(done) {
    h.driver.setOrientation("PORTRAIT", function(err) {
      should.not.exist(err);
      var next = function() {
        h.driver.getOrientation(function(err, orientation) {
          should.not.exist(err);
          orientation.should.equal("PORTRAIT");
          done();
        });
      };
      setTimeout(next, 3000);
    });
  });
});


