"use strict";

var setup = require("../../common/setup-base"),
    desired = require('./desired'),
    toggleTest = require('./toggle-base').toggleTest;

describe('toggle - cellular data @skip-ci', function () {
  var promisedBrowser = setup(this, desired);
  toggleTest(promisedBrowser, "cellular data", "data_toggle", "toggleData");
});
