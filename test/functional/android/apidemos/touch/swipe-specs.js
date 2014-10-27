"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , reset = require("../reset")
  , wd = require("wd")
  , TouchAction = wd.TouchAction;


describe("apidemo - touch - swipe", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  var contentEl, animationEl, viewsEl;

  if (env.FAST_TESTS) {
    beforeEach(function () {
      return reset(driver);
    });
  }

  var _assertResultAndReset = function () {
    if (!viewsEl) {
      return driver.elementByName("Views")
        .then(function (el) {
          viewsEl = el;
          return _assertResultAndReset();
        });
    } else {
      return viewsEl.isDisplayed().should.become(true)
        .then(function () {
          return new TouchAction(driver)
            .press({el: contentEl}).wait({ms: 500}).moveTo({el: viewsEl}).release().perform()
            .elementByName("Accessibility").isDisplayed().should.become(true);
        });
    }
  };

  it('should be possible with press/moveTo/release and element as target', function (done) {
    var x = 0, y = 0, hOffset;
    var contentElPos = { x: 0, y: 0 }
      , animationElPos = { x: 0, y: 0 }
      , delta = { x: 0, y: 0 };
    driver
      .elementByName("Content")
      .then(function (el) { contentEl = el; return contentEl; })
      .getLocation()
      .then(function (loc) {x = loc.x; y = loc.y; return contentEl;})
      .getSize()
      .then(function (re) {
        hOffset = re.height * 0.5;
        contentElPos.x = x + (re.width * 0.5);
        contentElPos.y = y + hOffset;
      })
      .elementByName("Animation")
      .then(function (el) {
        animationEl = el;
        return animationEl;
      })
      .getLocation()
      .then(function (loc) {
        animationElPos.x = contentElPos.x;
        animationElPos.y = loc.y + hOffset;
        delta.x = 0;
        delta.y = animationElPos.y - contentElPos.y;
        return contentEl;
      })

      // test: press {element}, moveTo {element}
      .then(function () {
        return new TouchAction(driver)
          .press({el: contentEl}).wait({ms: 500}).moveTo({el: animationEl}).release().perform();
      })
      .then(_assertResultAndReset)

      // test: press {element, x, y}, moveTo {element, x, y}
      .then(function () {
        return new TouchAction(driver)
          .press({el: contentEl, x: 20, y: 0.4}).wait({ms: 500}).moveTo({el: contentEl, x: delta.x, y: delta.y }).release().perform();
      })
      .then(_assertResultAndReset)

      // test: press {x, y}, moveTo {x, y}
      .then(function () {
        return new TouchAction(driver)
          .press(contentElPos).wait({ms: 500}).moveTo(animationElPos).release().perform();
      })
      .then(_assertResultAndReset)

      // test: press {element, x, y}, moveTo {destEl, x, y}
      .then(function () {
        return new TouchAction(driver)
          .press({el: contentEl, x: 0.6, y: 35}).wait({ms: 500}).moveTo({el: animationEl, x: 25, y: 25 }).release().perform();
      })
      .then(_assertResultAndReset)

      // test: press {x, y}, moveTo {destEl}
      .then(function () {
        return new TouchAction(driver)
          .press(contentElPos).wait({ms: 500}).moveTo({el: animationEl}).release().perform();
      })
      .then(_assertResultAndReset)

      .nodeify(done);
  });
});
