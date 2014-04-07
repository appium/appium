"use strict";

var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base")
  , desired = require("./desired")
  , androidReset = require('../../../helpers/reset').androidReset
  , Q = require("q")
  , _ = require("underscore")
  , wd = require("wd")
  , TouchAction = wd.TouchAction
  , MultiAction = wd.MultiAction;


describe("apidemo - gestures -", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function (done) {
      androidReset('com.example.android.apis', '.ApiDemos').nodeify(done);
    });
  }

  describe('tap visible element', function () {
    it('should tap an element', function (done) {
      driver.elementByName("Animation")
        .then(function (el) {
          var action = new TouchAction(el);
          action.tap().perform();
        })
        .elementsByTagName("text").then(function (els) { return els[1]; })
          .text().should.become("Bouncing Balls")
        .nodeify(done);
    });

    it('should tap an element from an offset', function (done) {
      driver.elementByName("Animation")
        .then(function (el) {
          var action = new TouchAction(el);
          return action.tap({ x: 1, y: 1 }).perform();
        })
        .elementsByTagName("text").then(function (els) { return els[1]; })
          .text().should.become("Bouncing Balls")
        .nodeify(done);
    });

    it('should tap an element twice', function (done) {
      driver
        .elementByName("Text")
        .then(function (el) {
          var action = new TouchAction(el);
          return action.tap().perform();
        })
        .elementByName("LogTextBox")
        .then(function (el) {
          var action = new TouchAction(el);
          return action.tap().perform();
        })
        .elementByName("Add")
        .then(function (el) {
          var action = new TouchAction(el);
          return action.tap({ count: 2 }).perform();
        })
        .elementsByTagName("text")
        .then(function (els) {
          return els[1];
        })
        .text()
        .should.become("This is a test\nThis is a test\n")
        .nodeify(done);
    });

    it('should tap an element from an offset twice', function (done) {
      driver
        .elementByName("Text")
        .then(function (el) {
          var action = new TouchAction(el);
          return action.tap().perform();
        })
        .elementByName("LogTextBox")
        .then(function (el) {
          var action = new TouchAction(el);
          return action.tap().perform();
        })
        .elementByName("Add")
        .then(function (el) {
          var action = new TouchAction(el);
          return action.tap({ count: 2 }).perform();
        })
        .elementsByTagName("text")
        .then(function (els) {
          return els[1];
        })
        .text()
        .should.become("This is a test\nThis is a test\n")
        .nodeify(done);
    });
  });

  describe('press', function () {
    it('should work like `tap` when immediately released', function (done) {
      driver.elementByName("Content")
        .then(function (el) {
          var action = new TouchAction(el);
          action.press();
          driver
            .elementByName("Animation")
            .then(function (el2) {
              return action.moveTo({ element: el2.value.toString() }).release().perform();
            });
        })
        .sleep(500)
        .elementByName("Views")
        .then(function (el) {
          var action = new TouchAction(el);
          return action.press().release().perform();
        })
        .sleep(500)
        .elementByName("Expandable Lists")
        .then(function (el) {
          var action = new TouchAction(el);
          return action.press().release().perform();
        })
        .sleep(500)
        .elementByName("1. Custom Adapter")
        .then(function (el) {
          var action = new TouchAction(el);
          return action.press().release().perform();
        })
        .sleep(500)
        .elementByName("People Names") //.should.eventually.exist
        .then(function (el) {
          var action = new TouchAction(el);
          return action.press().release().perform();
        })
        .elementByName("Sample menu").should.be.rejected
        .nodeify(done);
    });

    it('should work like `longPress` when released after a pause', function (done) {
      driver.elementByName("Content")
        .then(function (el) {
          var action = new TouchAction(el);
          action.press();
          driver
            .elementByName("Animation")
            .then(function (el2) {
              return action.moveTo({ element: el2.value.toString() }).release().perform();
            });
        })
        .sleep(500)
        .elementByName("Views")
        .then(function (el) {
          var action = new TouchAction(el);
          return action.press().release().perform();
        })
        .sleep(500)
        .elementByName("Expandable Lists")
        .then(function (el) {
          var action = new TouchAction(el);
          return action.press().release().perform();
        })
        .sleep(500)
        .elementByName("1. Custom Adapter")
        .then(function (el) {
          var action = new TouchAction(el);
          return action.press().release().perform();
        })
        .sleep(500)
        .elementByName("People Names") //.should.eventually.exist
        .then(function (el) {
          var action = new TouchAction(el);
          return action.press().wait(1000).release().perform();
        })
        .elementByName("Sample menu").should.eventually.exist
        .nodeify(done);
    });
  });

  describe('longPress', function () {
    it('should open a context menu', function (done) {
      driver.elementByName("Content")
        .then(function (el) {
          var action = new TouchAction(el);
          action.press();
          driver
            .elementByName("Animation")
            .then(function (el2) {
              return action.moveTo({ element: el2.value.toString() }).release().perform();
            });
        })
        .sleep(500)
        .elementByName("Views")
        .then(function (el) {
          var action = new TouchAction(el);
          return action.tap().perform();
        })
        .sleep(500)
        .elementByName("Expandable Lists")
        .then(function (el) {
          var action = new TouchAction(el);
          return action.tap().perform();
        })
        .sleep(500)
        .elementByName("1. Custom Adapter")
        .then(function (el) {
          var action = new TouchAction(el);
          return action.tap().perform();
        })
        .sleep(500)
        .elementByName("People Names")
        .then(function (el) {
          var action = new TouchAction(el);
          return action.longPress().release().perform();
        })
        .elementByName("Sample menu").should.eventually.exist
        .nodeify(done);
    });
  });

  describe('swipe', function () {
    it('should be possible with press/moveTo/release', function (done) {
      driver.elementByName("Content")
        .then(function (el) {
          var action = new TouchAction(el);
          action.press();
          driver
            .elementByName("Animation")
            .then(function (el2) {
              return action.moveTo({ element: el2.value.toString() }).release().perform();
            });
        })
        .sleep(500)
        .elementByName("Views").should.eventually.exist
        .nodeify(done);
    });

    it('should be possible with press/moveTo/release and pixel offset', function (done) {
      driver.elementByName("Content")
        .then(function (el) {
          var action = new TouchAction(el);
          action.press().moveTo({ x: 0, y: -400 }).release().perform();
        })
        .sleep(500)
        .elementByName("Views").should.eventually.exist
        .nodeify(done);
    });
  });

  describe('drag', function () {
    it('should drag by pixels @skip-android-all', function (done) {
      driver
        .elementByName("Content")
        .then(function (el) {
          var action = new TouchAction(el);
          action.press();
          driver
            .elementByName("Animation")
            .then(function (el2) {
              return action.moveTo({ element: el2.value.toString() }).release().perform();
            });
        })
        .sleep(500)
        .elementByName("Views")
        .then(function (el) {
          var action = new TouchAction(el);
          action.tap().perform();
        })
        .sleep(500)
        .elementByName("Drag and Drop")
        .then(function (el) {
          var action = new TouchAction(el);
          action.tap().perform();
        })
        .sleep(500)
        .elementById("com.example.android.apis:id/drag_dot_3")
        .then(function (dd3) {
          return driver
            .elementById("com.example.android.apis:id/drag_dot_2")
            .then(function (dd2) {
              var action = new TouchAction(dd3);
              return action.longPress().moveTo({ element: dd2.value.toString() }).release().perform();
            });
        })
        .sleep(1500)
        .elementById("com.example.android.apis:id/drag_result_text").text()
          .should.become("Dropped!")
        .sleep(15000)
        .nodeify(done);
    });
  });


  describe('multi actions', function () {
    it('should scroll two different lists', function (done) {
      var scrollOpts = {};
      driver
        .elementByTagName("listView")
        .then(function (el) {
          scrollOpts = {
            element: el.value
          , text: 'Views'
          };
          return driver.execute("mobile: scrollTo", [scrollOpts]);
        }).elementByXPath("//text[@value='Views']")
        .then(function (el) {
          return new TouchAction(el).tap().perform();
        })
        .then(function () {
          scrollOpts.text = 'Splitting Touches across Views';
          return driver.execute("mobile: scrollTo", [scrollOpts]);
        }).elementByXPath("//text[@value='Splitting Touches across Views']")
        .then(function (el) {
          return new TouchAction(el).tap().perform();
        })
        .elementsByTagName("listView")
        .then(function (els) {
          // scroll slowly on the left
          var a1 = new TouchAction(els[0]);
          a1
            .press()
            .moveTo({ x: 10, y: 0 })
            .moveTo({ x: 10, y: -75 })
            .moveTo({ x: 10, y: -150 })
            .release();

          // scross quickly on the right
          var a2 = new TouchAction(els[1]);
          a2
            .press()
            .moveTo({ x: 10, y: 0 })
            .moveTo({ x: 10, y: -300 })
            .moveTo({ x: 10, y: -600 })
            .release();

          var ma = new MultiAction(els[0]);
          ma.add(a1, a2);
          ma.perform();
        })
        .sleep(15000)
        .nodeify(done);
    });

    it('should scroll two different lists with waits', function (done) {
      var scrollOpts = {};
      driver
        .elementByTagName("listView")
        .then(function (el) {
          scrollOpts = {
            element: el.value
          , text: 'Views'
          };
          return driver.execute("mobile: scrollTo", [scrollOpts]);
        }).elementByXPath("//text[@value='Views']")
        .then(function (el) {
          return new TouchAction(el).tap().perform();
        })
        .then(function () {
          scrollOpts.text = 'Splitting Touches across Views';
          return driver.execute("mobile: scrollTo", [scrollOpts]);
        }).elementByXPath("//text[@value='Splitting Touches across Views']")
        .then(function (el) {
          return new TouchAction(el).tap().perform();
        })
        .elementsByTagName("listView")
        .then(function (els) {
          // scroll slowly on the left
          var a1 = new TouchAction(els[0]);
          a1
            .press()
            .moveTo({ x: 10, y: 0 })
            .moveTo({ x: 10, y: -75 })
            .wait(1000)
            .moveTo({ x: 10, y: -350 })
            .release();

          // scross quickly on the right
          var a2 = new TouchAction(els[1]);
          a2
            .press()
            .moveTo({ x: 10, y: 100 })
            .moveTo({ x: 10, y: -300 })
            .wait(500)
            .moveTo({ x: 10, y: -600 })
            .release();

          var ma = new MultiAction(els[0]);
          ma.add(a1, a2);
          ma.perform();
        })
        .sleep(15000)
        .nodeify(done);
    });
  });
});
