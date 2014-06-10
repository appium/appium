"use strict";

var okIfAlert = require('../../../helpers/alert').okIfAlert,
    setup = require("../../common/setup-base"),
    desired = require('./desired');

describe('testapp - pinchOpen/pinchClose', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should pinchOpen and pinchClose map after tapping Test Gesture', function (done) {
    driver
      .elementsByClassName('UIAButton').at(5).click()
      .sleep(1000).then(function () { okIfAlert(driver); })
      .elementByXPath('//UIAMapView')
      .execute("mobile: pinchOpen", [{startX: 114.0, startY: 198.0, endX: 257.0,
        endY: 256.0, duration: 5.0}])
      .elementByXPath('//UIAMapView')
      .execute("mobile: pinchClose", [{startX: 114.0, startY: 198.0, endX: 257.0,
        endY: 256.0, duration: 5.0}])
      .nodeify(done);
  });
});
