"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/gps-demo/bin/GPSTutorial1.apk")
  , appPkg = "de.impressive.artworx.tutorials.gps"
  , appAct = "GPSTest"
  , driverBlock = require("../../helpers/driverblock.js")
  , describeWd = driverBlock.describeForApp(appPath, "android", appPkg, appAct)
  , it = driverBlock.it;

describeWd('geo location', function(h) {
  it('should set geo location', function(done) {
    var getText = function() { return h.driver.elementByXPath("//text[2]").text(); };
    var newLat = "27.17";
    var newLong = "78.04";
    h.driver
      .resolve(getText()).then(function(text) {
        text.should.not.include("Latitude: " + newLat);
        text.should.not.include("Longitude: " + newLong);
      }).then(function() {
        var locOpts = {latitude: newLat, longitude: newLong};
        return h.driver.execute("mobile: setLocation", [locOpts]);
      }).sleep(1000).then(getText).then(function(text) {
        text.should.include("Latitude: " + newLat.substr(0, 4));
        text.should.include("Longitude: " + newLong.substr(0, 4));
      }).nodeify(done);
  });
});

