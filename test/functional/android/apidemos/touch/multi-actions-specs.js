"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , wd = require("wd")
  , droidText = 'android.widget.TextView'
  , droidList = 'android.widget.ListView'
  , TouchAction = wd.TouchAction
  , MultiAction = wd.MultiAction;


describe("apidemo - touch - multi-actions", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function () {
      return driver.resetApp();
    });
  }

  it('should scroll two different lists', function (done) {
    var scrollOpts = {};
    driver
      .elementByClassName(droidList)
      .then(function (el) {
        scrollOpts = {
          element: el.value
        , text: 'Views'
        };
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//" + droidText + "[@text='Views']")
      .then(function (el) {
        return new TouchAction(driver).tap({el: el}).perform();
      })
      .then(function () {
        scrollOpts.text = 'Splitting Touches across Views';
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//" + droidText + "[@text='Splitting Touches across Views']")
      .then(function (el) {
        return new TouchAction(driver).tap({el: el}).perform();
      })
      .elementsByClassName(droidList)
      .then(function (els) {
        // scroll slowly on the left
        var a1 = new TouchAction();
        a1
          .press({el: els[0]})
          .moveTo({el: els[0], x: 10, y: 0 })
          .moveTo({el: els[0], x: 10, y: -75 })
          .moveTo({el: els[0], x: 10, y: -150 })
          .release();

        // scross quickly on the right
        var a2 = new TouchAction();
        a2
          .press({el: els[1]})
          .moveTo({el: els[1], x: 10, y: 0 })
          .moveTo({el: els[1], x: 10, y: -300 })
          .moveTo({el: els[1], x: 10, y: -600 })
          .release();

        var ma = new MultiAction(els[0]);
        ma.add(a1, a2);
        return ma.perform();
      })
      .nodeify(done);
  });
});
