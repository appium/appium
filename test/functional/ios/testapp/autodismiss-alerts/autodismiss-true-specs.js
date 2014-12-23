"use strict";

var setup = require("../../../common/setup-base"),
    desired = require('../desired'),
    _ = require('underscore');

describe('testapp - autoDismissAlerts cap = true', function () {
  var self = this;
  var driver;

  var caps = _.clone(desired);
  caps.autoDismissAlerts = true;
  setup(self, caps).then(function (d) { driver = d; });

  it('auto-dismiss alerts', function (done) {
    driver
      .elementByAccessibilityId('show alert').click()
      .sleep(2000)
      .alertText()
      .should.be.rejectedWith(/status: 27/)
      .nodeify(done);
  });
});

describe('testapp - autoDismissAlerts cap = "true"', function () {
  var self = this;
  var driver;

  var caps = _.clone(desired);
  caps.autoDismissAlerts = 'true';
  setup(self, caps).then(function (d) { driver = d; });

  it('auto-dismiss alerts', function (done) {
    driver
      .elementByAccessibilityId('show alert').click()
      .sleep(2000)
      .alertText()
      .should.be.rejectedWith(/status: 27/)
      .nodeify(done);
  });
});
