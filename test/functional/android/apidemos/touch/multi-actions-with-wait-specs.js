"use strict";

var setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , wd = require("wd")
  , droidText = 'android.widget.TextView'
  , droidList = 'android.widget.ListView'
  , TouchAction = wd.TouchAction
  , MultiAction = wd.MultiAction;


describe("apidemo - touch - multi-actions with wait", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should scroll two different lists with waits', function (done) {
    var scrollOpts = {};
    driver
      .elementByClassName(droidList)
      .then(function (el) {
        scrollOpts = {
          element: el.value
        , text: 'Views'
        };
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      })
      .elementByXPath("//" + droidText + "[@text='Views']")
      .then(function (el) {
        return new TouchAction(driver).tap({el: el}).perform();
      })
      .then(function () {
        scrollOpts.text = 'Splitting Touches across Views';
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      })
      .elementByXPath("//" + droidText + "[@text='Splitting Touches across Views']")
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
          .wait(1000)
          .moveTo({el: els[0], x: 10, y: -350 })
          .release();

        // scross quickly on the right
        var a2 = new TouchAction();
        a2
          .press({el: els[1]})
          .moveTo({el: els[1], x: 10, y: 100 })
          .moveTo({el: els[1], x: 10, y: -300 })
          .wait(500)
          .moveTo({el: els[1], x: 10, y: -600 })
          .release();

        var ma = new MultiAction(driver);
        ma.add(a1, a2);
        return ma.perform();
      })
      .nodeify(done);
  });
});
