"use strict";

var setup = require("../../../common/setup-base")
  , desired = require('../desired');

describe('uicatalog - gestures - mobile shake @skip-ios6', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should not error', function (done) {
    driver.shakeDevice().nodeify(done);
  });
});

