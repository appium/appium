"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/gps-demo/bin/GPSTutorial1.apk")
  , appPkg = "de.impressive.artworx.tutorials.gps"
  , appAct = "GPSTest"
  , driverBlock = require("../../helpers/driverblock.js")
  , describeWd = driverBlock.describeForApp(appPath, "android", appPkg, appAct)
  , it = driverBlock.it
  , should = require('should');

describeWd('geo location', function(h) {
  it('should set geo location', function(done) {

    var getText = function(cb) {
      h.driver.elementByXPath("//text[2]", function(err, el) {
        should.not.exist(err);
        el.text(cb);
      });
    };
    var newLat = "27.17";
    var newLong = "78.04";
    getText(function(err, text) {
      if (err) throw err;
      text.should.not.include("Latitude: " + newLat);
      text.should.not.include("Longitude: " + newLong);
      var locOpts = {latitude: newLat, longitude: newLong};
      h.driver.execute("mobile: setLocation", [locOpts], function(err) {
        should.not.exist(err);
        getText(function(err, text) {
          if (err) throw err;
          text.should.include("Latitude: " + newLat.substr(0, 4));
          text.should.include("Longitude: " + newLong.substr(0, 4));
          done();
        });
      });
    });
  });
});

