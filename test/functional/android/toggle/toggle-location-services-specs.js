"use strict";

var setup = require("../../common/setup-base"),
    desired = require('./desired'),
    toggleTest = require('./toggle-base').toggleTest;

describe('toggle - location services', function () {
  var promisedBrowser = setup(this, desired);
  toggleTest(promisedBrowser, "Location Services", "gps_toggle", "toggleLocationServices");
});
