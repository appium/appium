"use strict";

var setup = require("../common/setup-base")
  , desired = require("./desired")
  , path = require('path');

var desired = {
  app: path.resolve(__dirname, '../../../sample-code/apps/gps-demo/bin/GPSTutorial1.apk'),
  'app-package': 'de.impressive.artworx.tutorials.gps',
  'app-activity': 'GPSTest'
};

describe("apidemo - location -", function() {
  var driver;
  setup(this, desired).then( function(d) { driver = d; } );

  it('should set geo location', function(done) {
    var getText = function() { return driver.elementByXPath("//text[2]").text(); };
    var newLat = "27.17";
    var newLong = "78.04";
    driver
      .resolve(getText()).then(function(text) {
        text.should.not.include("Latitude: " + newLat);
        text.should.not.include("Longitude: " + newLong);
      }).then(function() {
        var locOpts = {latitude: newLat, longitude: newLong};
        return driver.execute("mobile: setLocation", [locOpts]);
      }).sleep(1000).then(getText).then(function(text) {
        text.should.include("Latitude: " + newLat.substr(0, 4));
        text.should.include("Longitude: " + newLong.substr(0, 4));
      }).nodeify(done);
  });
});

