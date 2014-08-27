"use strict";

var setup = require("../common/setup-base")
  , getAppPath = require('../../helpers/app').getAppPath;

describe('crash recovery', function () {
  var driver;
  var desired = {
    app: getAppPath('TestApp')
  };

  setup(this, desired, {}, {FAST_TESTS: false}).then(function (d) { driver = d; });

  it('should be able to recover gracefully from an app crash during shutdown', function (done) {
    driver
      .elementByAccessibilityId("Crash")
      .click()
      .then(function () {
        return driver.sleep(500);
      })
      .source() // will error because we shut down while responding to this
        .should.eventually.be.rejectedWith('13')
    .nodeify(done);
  });

  it('should be able to recover gracefully from an app crash after shutdown', function (done) {
    driver
      .elementByAccessibilityId("Crash")
      .click()
      .then(function () {
        return driver.sleep(6000);
      })
      .source() // will 404 because the session is gone
        .should.eventually.be.rejectedWith('6')
    .nodeify(done);
  });
});

