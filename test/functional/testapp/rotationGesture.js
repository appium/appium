"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('TestApp')
  , it = require("../../helpers/driverblock.js").it;

describeWd('rotation gesture', function(h) {
  it('should rotate map after tapping Test Gesture', function(done) {
    h.driver.elementsByTagName('button')
      .then(function(buttons) { return buttons[3].click(); })
      .elementsByTagName('Map')
      .execute("mobile: rotate", [{x: 114, y: 198, duration: 5, radius: 3,
        rotation: 220, touchCount: 2}])
      .nodeify(done);
  });
});
