"use strict";

var okIfAlert = require('../../../helpers/alert').okIfAlert,
    setup = require("../../common/setup-base"),
    desired = require('./desired');

describe('testapp - rotation gesture', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should rotate map after tapping Test Gesture', function (done) {
    driver.elementsByClassName('UIAButton')
      .then(function (buttons) { return buttons[5].click(); })
      .sleep(1000).then(function () { okIfAlert(driver); })
      .elementsByClassName('UIAMap')
      .rotate({x: 114, y: 198, duration: 5, radius: 3, rotation: 220, touchCount: 2})
      .nodeify(done);
  });
});
