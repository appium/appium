"use strict";

var setup = require('./setup');

describe('rotation gesture', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it('should rotate map after tapping Test Gesture', function(done) {
    browser.elementsByTagName('button')
      .then(function(buttons) { return buttons[3].click(); })
      .elementsByTagName('Map')
      .execute("mobile: rotate", [{x: 114, y: 198, duration: 5, radius: 3,
        rotation: 220, touchCount: 2}])
      .nodeify(done);
  });
});
