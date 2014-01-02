"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('TestApp')
  , it = require("../../helpers/driverblock.js").it;

describeWd('pinchOpen and pinchClose gesture', function(h) {
  it('should pinchOpen and pinchClose map after tapping Test Gesture', function(done) {
    h.driver
      .elementsByTagName('button').then(function(buttons) { return buttons[3].click(); })
      .elementByXPath('//window[1]/UIAMapView[1]')
      .execute("mobile: pinchOpen", [{startX: 114.0, startY: 198.0, endX: 257.0,
        endY: 256.0, duration: 5.0}])
      .elementByXPath('//window[1]/UIAMapView[1]')
      .execute("mobile: pinchClose", [{startX: 114.0, startY: 198.0, endX: 257.0,
        endY: 256.0, duration: 5.0}])
      .nodeify(done);
  });
});
