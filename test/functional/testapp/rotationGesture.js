"use strict";

var alertUtils = require('../../helpers/alert-utils'),
    setup = require("../common/setup-base"),
    desired = require('./desired');

describe('testapp - rotation gesture -', function() {
  var driver;
  setup(this, desired).then( function(d) { driver = d; } );

  it('should rotate map after tapping Test Gesture', function(done) {
    driver.elementsByTagName('button')
      .then(function(buttons) { return buttons[3].click(); })
      .sleep(1000).then( function() { alertUtils.okIfAlert(driver); } )
      .elementsByTagName('Map')
      .execute("mobile: rotate", [{x: 114, y: 198, duration: 5, radius: 3,
        rotation: 220, touchCount: 2}])
      .nodeify(done);
  });
});
