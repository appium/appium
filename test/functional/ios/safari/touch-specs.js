"use strict";

var setup = require("../../common/setup-base"),
    webviewHelper = require("../../../helpers/webview"),
    testEndpoint = webviewHelper.testEndpoint;

describe('touch', function () {
  var driver,
      desired = {
        "browserName": "safari"
      };

  setup(this, desired, {'no-reset': true}).then(function (d) { driver = d; });

  it('should flick element', function (done) {
    driver
      .get(testEndpoint(desired) + 'touch.html')
      .elementById('flickElem')
      .getLocation()
      .then(function (l1) {
        var dx = 30,
            dy = 30;
        return driver
          .elementById('flickElem')
          .flick(dx, dy, 0)
          .sleep(1000)
          .getLocation()
          .then(function (l2) {
            // UI Atomation's flickFromTo() seems to be not prices enough.
            // And in most cases safari receives the last touchmove event
            // with the coordinates which are by one pixel less than desired
            // destination. Hence allow some deviation here.
            l2.x.should.be.within(l1.x + dx - 2, l1.x + dx + 2);
            l2.y.should.be.within(l1.y + dy - 2, l1.y + dy + 2);
          });
       })
       .nodeify(done);
  });
});
