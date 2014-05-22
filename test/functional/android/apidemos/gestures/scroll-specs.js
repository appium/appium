"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , droidList = 'android.widget.ListView';

describe("apidemo - gestures - scroll", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function (done) {
      driver.resetApp()
        .then(function () { return driver.sleep(3000); })
        .nodeify(done);
    });
  }

  // todo fix this: got Error response status: 13, Could not scroll element into view: Views
  it('should bring the element into view @skip-android-all', function (done) {
    driver
      // .elementByName("Views").should.be.rejected // shouldn't be visible
      .elementByClassName(droidList)
      .then(function (el) {
        var scrollOpts = {
          element: el.value
        , text: 'Views'
        };
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByName("Views").should.eventually.exist
      .nodeify(done);
  });
});
