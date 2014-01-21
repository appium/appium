"use strict";

var setup = require("../common/setup-base")
  , path = require('path');

var desired = {
    app: path.resolve(__dirname, "../../../sample-code/apps/ToggleTest/bin/ToggleTest-debug.apk"),
    'app-package': 'com.example.toggletest',
    'app-activity': '.MainActivity'
};

var toggleTest = function(promisedBrowser, displayName, toggleElementName, toggleMethod) {
  return function() {
    var browser;
    promisedBrowser.then( function(_browser) { browser = _browser; } );

    var initialValue;
    it('should toggle ' + displayName, function(done) {
      browser
        .elementByName(toggleElementName).text().then(function(txt) {
          initialValue = txt;
          return browser.execute("mobile: " + toggleMethod);
        })
        .then(function() {
          return browser.elementByName(toggleElementName).text().then(function(txt) {
            txt.should.equal(initialValue === "ON" ? "OFF" : "ON");
          });
        })
        .nodeify(done);
    });

    it('should toggle ' + displayName + ' back to initial value', function(done) {
      browser.execute("mobile: " + toggleMethod)
        .then(function() {
          return browser.elementByName(toggleElementName).text().then(function(txt) {
            txt.should.equal(initialValue);
          });
        })
        .nodeify(done);
    });
  };
};

describe('toggles', function() {
  var promisedBrowser = setup(this, desired);

  describe('toggle cellular data', toggleTest(promisedBrowser, "cellular data", "data_toggle", "toggleData"));
  describe('toggle Flight Mode', toggleTest(promisedBrowser, "Flight Mode", "flight_toggle", "toggleFlightMode"));
  describe('toggle Wi-Fi', toggleTest(promisedBrowser, "Wi-Fi", "wifi_toggle", "toggleWiFi"));
  describe('toggle Location Services', toggleTest(promisedBrowser, "Location Services", "gps_toggle", "toggleLocationServices"));
}, null, null, {newCommandTimeout: 90});

