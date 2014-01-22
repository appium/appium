"use strict";

var driverBlock = require("../../helpers/driverblock.js")
  , Q =  driverBlock.Q
  , path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ToggleTest/bin/ToggleTest-debug.apk")
  , appPkg = "com.example.toggletest"
  , appAct = ".MainActivity"
  , it = driverBlock.it;

var toggleTest = function(h, displayName, toggleElementName, toggleMethod) {
  return function() {
    var initialValue;
    it('should toggle ' + displayName, function(done) {
      h.driver
        .elementByName(toggleElementName).text().then(function(txt) {
          initialValue = txt;
          return h.driver.execute("mobile: " + toggleMethod);
        })
        .then(function() {
          return h.driver.elementByName(toggleElementName).text().then(function(txt) {
            txt.should.equal(initialValue === "ON" ? "OFF" : "ON");
          });
        })
        .nodeify(done);
    });

    it('should toggle ' + displayName + ' back to initial value', function(done) {
      h.driver.execute("mobile: " + toggleMethod)
        .then(function() {
          return h.driver.elementByName(toggleElementName).text().then(function(txt) {
            txt.should.equal(initialValue);
          });
        })
        .nodeify(done);
    });
  };
};

var runForPlatform = function(platform) {
  var describeWd = driverBlock.describeForApp(appPath, platform, appPkg, appAct);

  describeWd('toggles', function(h) {
    describe('toggle cellular data', toggleTest(h, "cellular data", "data_toggle", "toggleData"));
    describe('toggle Flight Mode', toggleTest(h, "Flight Mode", "flight_toggle", "toggleFlightMode"));
    describe('toggle Wi-Fi', toggleTest(h, "Wi-Fi", "wifi_toggle", "toggleWiFi"));
    describe('toggle Location Services', toggleTest(h, "Location Services", "gps_toggle", "toggleLocationServices"));
  }, null, null, {newCommandTimeout: 90});
};

module.exports.runForPlatform = runForPlatform;

