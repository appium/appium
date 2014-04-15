"use strict";

var setup = require("../common/setup-base")
  , getAppPath = require('../../helpers/app').getAppPath;

module.exports = {
  app: getAppPath('TestApp')
};

var desired = {
  app: getAppPath('ToggleTest'),
  appPackage: 'com.example.toggletest',
  appActivity: '.MainActivity',
  newCommandTimeout: 90
};

var toggleTest = function (promisedBrowser, displayName, toggleElementName, toggleMethod) {
  return function () {
    var driver;
    promisedBrowser.then(function (d) { driver = d; });

    var initialValue;
    it('should toggle ' + displayName, function (done) {
      driver
        .elementByName(toggleElementName).text().then(function (txt) {
          initialValue = txt;
          return driver[toggleMethod]();
        })
        .then(function () {
          return driver.elementByName(toggleElementName).text().then(function (txt) {
            txt.should.equal(initialValue === "ON" ? "OFF" : "ON");
          });
        })
        .nodeify(done);
    });

    it('should toggle ' + displayName + ' back to initial value', function (done) {
      driver[toggleMethod]()
        .then(function () {
          return driver.elementByName(toggleElementName).text().then(function (txt) {
            txt.should.equal(initialValue);
          });
        })
        .nodeify(done);
    });
  };
};

describe('toggles', function () {
  var promisedBrowser = setup(this, desired);

  describe('toggle cellular data', toggleTest(promisedBrowser, "cellular data", "data_toggle", "toggleData"));
  describe('toggle Flight Mode', toggleTest(promisedBrowser, "Flight Mode", "flight_toggle", "toggleFlightMode"));
  describe('toggle Wi-Fi @skip-android-all', toggleTest(promisedBrowser, "Wi-Fi", "wifi_toggle", "toggleWiFi"));
  describe('toggle Location Services', toggleTest(promisedBrowser, "Location Services", "gps_toggle", "toggleLocationServices"));
});
