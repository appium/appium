"use strict";

var setup = require("../common/setup-base")
  , desired = require("./desired")
  , path = require('path');

var desired = {
  app: path.resolve(__dirname, '../../../sample-code/apps/gps-demo/bin/GPSTutorial1.apk'),
  'app-package': 'de.impressive.artworx.tutorials.gps',
  'app-activity': 'GPSTest'
};

describe('geo location', function() {
  var browser;
  setup(this, desired)
   .then( function(_browser) { browser = _browser; } );

  it('should set geo location', function(done) {
    var getText = function() { return browser.elementByXPath("//text[2]").text(); };
    var newLat = "27.17";
    var newLong = "78.04";
    browser
      .resolve(getText()).then(function(text) {
        text.should.not.include("Latitude: " + newLat);
        text.should.not.include("Longitude: " + newLong);
      }).then(function() {
        var locOpts = {latitude: newLat, longitude: newLong};
        return browser.execute("mobile: setLocation", [locOpts]);
      }).sleep(1000).then(getText).then(function(text) {
        text.should.include("Latitude: " + newLat.substr(0, 4));
        text.should.include("Longitude: " + newLong.substr(0, 4));
      }).nodeify(done);
  });
});

