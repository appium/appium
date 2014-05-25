"use strict";

var setup = require("../../common/setup-base"),
    desired = require('./desired'),
    toggleTest = require('./toggle-base').toggleTest;

// TODO: very flaky on sauce, investigate.
describe('toggle - flight mode @skip-ci', function () {
  var promisedBrowser = setup(this, desired);
  toggleTest(promisedBrowser, "Flight Mode", "flight_toggle", "toggleFlightMode");
});
