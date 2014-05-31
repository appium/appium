"use strict";

var setup = require("../common/setup-base")
  , desired = require('./desired');

// TODO: not working on sauce, investigate
describe('uninstall app @skip-ci', function () {

  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should be able to uninstall the app', function (done) {
    driver
      .removeApp("io.appium.android.apis")
      .nodeify(done);
  });

});
