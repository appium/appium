"use strict";

var setup = require("../../common/setup-base")
  , desired = require("./desired")
  , Asserter = require('wd').Asserter;

describe("gpsDemo - location @skip-real-device", function () {
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

    var textPopulated = new Asserter(
      function () {
        return getText().then(function (text) {
          if (text === 'GPS Tutorial') {
            var err = new Error('retry');
            err.retriable = true; // if an asserter throws an error with the `retriable` property set to true, it gets retried
            throw err;
          } else {
            return true;
          }
        });
      }
    );

    var newLat = "27.17";
    var newLong = "78.04";

    driver
      .resolve(getText())
      .then(function (text) {
        text.should.not.include("Latitude: " + newLat);
        text.should.not.include("Longitude: " + newLong);
      })
      .setGeoLocation(newLat, newLong)
      .waitFor(textPopulated, 3)
      .then(getText)
      .then(function (text) {
        text.should.include("Latitude: " + newLat.substr(0, 4));
        text.should.include("Longitude: " + newLong.substr(0, 4));
      })
      .nodeify(done);
  });
});
