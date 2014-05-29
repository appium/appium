"use strict";

var setup = require("../../common/setup-base"),
    desired = require('./desired'),
    toggleTest = require('./toggle-base').toggleTest;

describe('toggle - wifi @skip-android-all', function () {
  var promisedBrowser = setup(this, desired);
  toggleTest(promisedBrowser, "Wi-Fi", "wifi_toggle", "toggleWiFi");
});
