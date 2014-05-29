"use strict";

var setup = require("../../../common/setup-base"),
    desired = require('../desired'),
    _ = require('underscore');

describe('testapp - autoAcceptAlerts cap = ""', function () {
  var self = this;
  var driver;

  var caps = _.clone(desired);
  caps.autoAcceptAlerts = "";
  setup(self, caps).then(function (d) { driver = d; });

  it('does not auto-accept alerts', function (done) {
    driver.elementsByClassName('UIAButton')
      .then(function (buttons) { return buttons[3].click(); })
      .sleep(2000)
      .alertText()
      .should.eventually.exist
      .nodeify(done);
  });
});
