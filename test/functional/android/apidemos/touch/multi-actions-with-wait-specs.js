"use strict";

var setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , wd = require("wd")
  , droidList = 'android.widget.ListView'
  , TouchAction = wd.TouchAction
  , MultiAction = wd.MultiAction
  , _ = require('underscore');


describe("apidemo - touch - multi-actions with wait", function () {
  var driver;
  setup(this, _.defaults({
    appActivity: '.view.SplitTouchView'
  }, desired)).then(function (d) { driver = d; });

  it('should scroll two different lists with waits', function (done) {
    driver
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
