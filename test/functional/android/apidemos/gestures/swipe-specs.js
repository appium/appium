"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require("../desired");

describe("apidemo - gestures - swipe", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function (done) {
      driver.resetApp()
        .then(function () { return driver.sleep(3000); })
        .nodeify(done);
    });
  }

  // todo fix this: got Error response status: 13, The swipe did not complete successfully
  it('should swipe screen by pixels @skip-android-all', function (done) {
    var swipeOpts = {
      startX: 100
    , startY: 500
    , endX: 100
    , endY: 100
    , duration: 1.2
    };
    driver
      .elementByName("Views").should.be.rejected // shouldn't be visible
      .execute("mobile: swipe", [swipeOpts])
      .elementByName("Views").should.eventually.exist
      .nodeify(done);
  });
  // todo fix this: got Error response status: 13, The swipe did not complete successfully
  it('should swipe screen by pct @skip-android-all', function (done) {
    var swipeOpts = {
      endX: 0.5
    , endY: 0.05
    , duration: 0.7
    };
    driver
      .elementByName("Views").should.be.rejected // shouldn't be visible
      .execute("mobile: swipe", [swipeOpts])
      .elementByName("Views").should.eventually.exist
      .nodeify(done);
  });
});
