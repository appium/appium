"use strict";

var okIfAlert = require('../../../helpers/alert').okIfAlert,
    setup = require("../../common/setup-base"),
    desired = require('./desired');

describe('testapp - pinch gesture -', function () {

  describe('pinchOpen and pinchClose gesture', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should pinchOpen and pinchClose map after tapping Test Gesture', function (done) {
      driver
        .elementsByTagName('button').then(function (buttons) { return buttons[3].click(); })
        .sleep(1000).then(function () { okIfAlert(driver); })
        .elementByXPath('//window[1]/UIAMapView[1]')
        .execute("mobile: pinchOpen", [{startX: 114.0, startY: 198.0, endX: 257.0,
          endY: 256.0, duration: 5.0}])
        .elementByXPath('//window[1]/UIAMapView[1]')
        .execute("mobile: pinchClose", [{startX: 114.0, startY: 198.0, endX: 257.0,
          endY: 256.0, duration: 5.0}])
        .nodeify(done);
    });
  });
});
