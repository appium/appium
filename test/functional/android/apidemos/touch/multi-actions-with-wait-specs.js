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
      }).elementByXPath("//" + droidText + "[@text='Views']")
      .then(function (el) {
        return new TouchAction().tap().performOn(el);
      })
      .then(function () {
        scrollOpts.text = 'Splitting Touches across Views';
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//" + droidText + "[@text='Splitting Touches across Views']")
      .then(function (el) {
        return new TouchAction().tap().performOn(el);
      })
      .elementsByClassName(droidList)
      .then(function (els) {
        // scroll slowly on the left
        var a1 = new TouchAction().applyTo(els[0]);
        a1
          .press()
          .moveTo({ x: 10, y: 0 })
          .moveTo({ x: 10, y: -75 })
          .wait(1000)
          .moveTo({ x: 10, y: -350 })
          .release();

        // scross quickly on the right
        var a2 = new TouchAction().applyTo(els[1]);
        a2
          .press()
          .moveTo({ x: 10, y: 100 })
          .moveTo({ x: 10, y: -300 })
          .wait(500)
          .moveTo({ x: 10, y: -600 })
          .release();

        var ma = new MultiAction();
        ma.add(a1, a2);
        return ma.performOn(els[0]);
      })
      .nodeify(done);
  });
});
