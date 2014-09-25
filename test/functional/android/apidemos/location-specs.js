"use strict";

var setup = require("../../common/setup-base")
  , desired = require("./desired");

var desired = {
  app: 'sample-code/apps/gps-demo/bin/GPSTutorial1.apk'
};

// TODO: bring back when new wd is published with setGeoLocation
describe("apidemo - location @skip-real-device", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should set geo location', function (done) {
    var getText = function () {
      return driver
        .elementsByClassName("android.widget.TextView")
        .then(function (els) {
          return els[1].text();
        });
    };
    var newLat = "27.17";
    var newLong = "78.04";
    driver
      .resolve(getText()).then(function (text) {
        text.should.not.include("Latitude: " + newLat);
        text.should.not.include("Longitude: " + newLong);
      })
      .setGeoLocation(newLat, newLong)
      .sleep(1000).then(getText).then(function (text) {
        text.should.include("Latitude: " + newLat.substr(0, 4));
        text.should.include("Longitude: " + newLong.substr(0, 4));
      }).nodeify(done);
  });
});

