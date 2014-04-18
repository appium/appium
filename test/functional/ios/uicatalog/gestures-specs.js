"use strict";

var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base")
  , desired = require('./desired')
  , spinWait = require('../../../helpers/spin.js').spinWait
  , textBlock = "Now is the time for all good developers to come to serve their country.\n";

// sebv: had to cut down original textBlock, cause text retrieved depends on device size
// textBlock = "Now is the time for all good developers to come to serve their country.\n\nNow is the time for all good developers to come to serve their country.\n\nThis text view can also use attributed strings.";

var SLOW_DOWN_MS = 1000;

describe('uicatalog - gestures -', function () {

  describe('flick @skip-ios7', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    if (env.FAST_TESTS) {
      afterEach(function (done) {
        driver
          .flick(0, 100, false)
          .flick(0, 100, false)
          .sleep(SLOW_DOWN_MS)
          .nodeify(done);
      });
    }

    it('should work via webdriver method', function (done) {
      driver
        .elementByClassName('UIATableCell').getLocation()
        .then(function (location1) {
          return driver
            .flick(0, -100, false)
            .elementByClassName('UIATableCell').getLocation()
            .then(function (location2) {
              location2.x.should.equal(location1.x);
              location2.y.should.not.equal(location1.y);
            });
        }).nodeify(done);
    });
    it('should work via mobile only method', function (done) {
      driver
        .elementByClassName('UIATableCell').getLocation()
        .then(function (location1) {
          return driver
            .execute("mobile: flick", [{endX: 0, endY: 0}])
            .elementByClassName('UIATableCell').getLocation()
            .then(function (location2) {
              location2.x.should.equal(location1.x);
              location2.y.should.not.equal(location1.y);
            });
        }).nodeify(done);
    });
    it('should not complete instantaneously', function (done) {
      var start = Date.now();
      driver
        .execute("mobile: flick", [{endX: 0, endY: 0}])
        .then(function () { (Date.now() - start).should.be.above(2500); })
        .nodeify(done);
    });
    it('should work via mobile only method with percentage', function (done) {
      var opts = {startX: 0.75, startY: 0.75, endX: 0.25, endY: 0.25};
      driver
        .elementByClassName('UIATableCell').getLocation()
        .then(function (location1) {
          return driver
            .execute("mobile: flick", [opts])
            .elementByClassName('UIATableCell').getLocation()
            .then(function (location2) {
              location2.x.should.equal(location1.x);
              location2.y.should.not.equal(location1.y);
            });
        }).nodeify(done);
    });
  });
  describe('swipe gesture @skip-ios7', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    if (env.FAST_TESTS) {
      afterEach(function (done) {
        driver
          .flick(0, 70, false)
          .flick(0, 70, false)
          .sleep(SLOW_DOWN_MS)
          .nodeify(done);
      });
    }
    it('should work with wd function in pixels', function (done) {
      driver
        .elementByClassName('UIATableCell').getLocation()
        .then(function (location1) {
          return spinWait(function () {
            return driver
              .flick(0, -70, true)
              .elementByClassName('UIATableCell').getLocation()
              .then(function (location2) {
                ((location2.x === location1.x) &&
                  (location2.y !== location1.y)
                ).should.be.ok;
              });
          }, 5000);

        }).nodeify(done);
    });
    it('should work with wd function in percent', function (done) {
      driver
        .elementByClassName('UIATableCell').getLocation()
        .then(function (location1) {
          return driver
            .flick(0, -0.1, true) // flaky
            .flick(0, -0.1, true)
            .flick(0, -0.1, true)
            .elementByClassName('UIATableCell').getLocation()
            .then(function (location2) {
              location2.x.should.equal(location1.x);
              location2.y.should.not.equal(location1.y, '===y');
            });
        }).nodeify(done);
    });
    it('should work with mobile function in pixels', function (done) {
      var opts = {startX: 50, startY: 400, endX: 50, endY: 300, duration: 2};
      driver
        .elementByClassName('UIATableCell').getLocation()
        .then(function (location1) {
          return spinWait(function () {
            return driver
              .execute("mobile: swipe", [opts])
              .elementByClassName('UIATableCell').getLocation()
              .then(function (location2) {
                location2.x.should.equal(location1.x);
                location2.y.should.not.equal(location1.y);
              });
          });
        }).nodeify(done);
    });
    it('should work with mobile function in percent', function (done) {
      var opts = {startX: 0.5, startY: 0.9, endX: 0.5, endY: 0.7, duration: 2};
      driver
        .elementByClassName('UIATableCell').getLocation()
        .then(function (location1) {
          return spinWait(function () {
            return driver
              .execute("mobile: swipe", [opts])
              .elementByClassName('UIATableCell').getLocation()
              .then(function (location2) {
                location2.x.should.equal(location1.x);
                location2.y.should.not.equal(location1.y);
              });
          });
        }).nodeify(done);
    });
    it('should not complete instantaneously', function (done) {
      var start = Date.now();
      var opts = {startX: 0.5, startY: 0.9, endX: 0.5, endY: 0.7, duration: 2};
      driver
        .execute("mobile: swipe", [opts])
        .then(function () {
          (Date.now() - start).should.be.above(1999);
        }).nodeify(done);
    });
  });

  describe("flick element @skip-ios7", function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    if (env.FAST_TESTS) {
      afterEach(function (done) {
        driver
          .elementByClassName("UIASlider")
          .then(function (el) { if (el) return el.sendKeys(0.5); })
          .then(function (el) { if (el) return el.sendKeys(0.5); })
          .clickBack()
          .sleep(SLOW_DOWN_MS)
          .nodeify(done);
      });
    }

    it("slider value should change", function (done) {
      var valueBefore, slider;
      driver
        .elementsByClassName('UIATableCell').then(function (els) { return els[1]; })
        .click()
        .elementByClassName("UIASlider").then(function (el) { slider = el; })
        .then(function () { return slider.getAttribute("value"); })
        .then(function (value) { valueBefore = value; })
        .then(function () { return slider.flick(-0.5, 0, 1); })
        .then(function () { return slider.getAttribute("value"); })
        .then(function (valueAfter) {
          valueBefore.should.not.equal("0%");
          valueAfter.should.equal("0%");
        }).nodeify(done);
    });
    it("should work with mobile flick", function (done) {
      var valueBefore, slider;
      driver
        .elementsByClassName('UIATableCell').then(function (els) { return els[1]; })
        .click()
        .elementByClassName("UIASlider").then(function (el) { slider = el; })
        .then(function () { return slider.getAttribute("value"); })
        .then(function (value) { valueBefore = value; })
        .then(function () {
          var opts = {element: slider.value, endX: -50, endY: 0};
          return driver.execute("mobile: flick", [opts]);
        })
        .then(function () { return slider.getAttribute("value"); })
        .then(function (valueAfter) {
          valueBefore.should.not.equal("0%");
          valueAfter.should.equal("0%");
        }).nodeify(done);
    });
    it("should work with mobile flick and percent", function (done) {
      var valueBefore, slider;
      driver
        .elementsByClassName('UIATableCell').then(function (els) { return els[1]; })
        .click()
        .elementByClassName("UIASlider").then(function (el) { slider = el; })
        .then(function () { return slider.getAttribute("value"); })
        .then(function (value) { valueBefore = value; })
        .then(function () {
          var opts = {element: slider.value, startX: 0.5, startY: 0.0,
            endX: 0.0, endY: 0.0};
          return driver.execute("mobile: flick", [opts]);
        })
        .then(function () { return slider.getAttribute("value"); })
        .then(function (valueAfter) {
          valueBefore.should.not.equal("0%");
          valueAfter.should.equal("0%");
        }).nodeify(done);
    });
  });
  describe("swipe element @skip-ios7", function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    if (env.FAST_TESTS) {
      afterEach(function (done) {
        driver
          .elementByClassName("UIASlider")
          .then(function (el) { if (el) return el.sendKeys(0.5); })
          .clickBack()
          .sleep(SLOW_DOWN_MS)
          .nodeify(done);
      });
    }

    it("slider value should change", function (done) {
      var valueBefore, slider;
      driver
        .elementsByClassName('UIATableCell').then(function (els) { return els[1]; })
        .click()
        .elementByClassName("UIASlider").then(function (el) { slider = el; })
        .then(function () { return slider.getAttribute("value"); })
        .then(function (value) { valueBefore = value; })
        .then(function () {
          var opts = {startX: 0.5, startY: 0.5, endX: 0.25, endY: 0.5,
            duration: 0.3, element: slider.value};
          return driver.execute("mobile: swipe", [opts]);
        })
        .then(function () { return slider.getAttribute("value"); })
        .then(function (valueAfter) {
          valueBefore.should.equal("50%");
          valueAfter.should.equal("20%");
        }).nodeify(done);
    });
    it("slider value should change by pixels", function (done) {
      var valueBefore, slider;
      driver
        .elementsByClassName('UIATableCell').then(function (els) { return els[1]; })
        .click()
        .elementByClassName("UIASlider").then(function (el) { slider = el; })
        .then(function () { return slider.getAttribute("value"); })
        .then(function (value) { valueBefore = value; })
        .then(function () {
          var opts = {endX: 15, endY: 10, duration: 0.3, element: slider.value};
          return driver.execute("mobile: swipe", [opts]);
        })
        .then(function () { return slider.getAttribute("value"); })
        .then(function (valueAfter) {
          valueBefore.should.equal("50%");
          valueAfter.should.equal("5%");
        }).nodeify(done);
    });
  });
  describe('complex tap', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    if (env.FAST_TESTS) {
      afterEach(function (done) {
        driver
          .clickBack()
          .sleep(SLOW_DOWN_MS)
          .nodeify(done);
      });
    }

    it('should work with custom options', function (done) {
      var tapOpts = {
        tapCount: 1 // how many taps
      , duration: 2.3 // how long
      , touchCount: 3 // how many fingers
      , x: 100 // in pixels from left
      , y: 250 // in pixels from top
      };
      driver
        .execute("mobile: tap", [tapOpts])
        .elementByClassName("UIATextView").text()
        .then(function (text) {
          text.should.include(textBlock);
        })
        .nodeify(done);
    });
    it('should work in relative units @skip-ios7', function (done) {
      var tapOpts = {
        tapCount: 1 // how many taps
      , duration: 2.3 // how long
      , touchCount: 3 // how many fingers
      , x: 0.5 // 50% from left of screen
      , y: 0.55 // 55% from top of screen
      };
      driver
        .execute("mobile: tap", [tapOpts])
        .elementByClassName('UIATextView').text()
        .then(function (text) {
          text.should.include(textBlock);
        })
        .nodeify(done);
    });
    it('should work with default options @skip-ios7', function (done) {
      driver
        .execute("mobile: tap")
        .elementByClassName('UIATextView').text()
        .then(function (text) {
          text.should.include(textBlock);
        })
        .nodeify(done);
    });
  });
  describe('complex tap on element', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    if (env.FAST_TESTS) {
      afterEach(function (done) {
        driver
          .clickBack()
          .sleep(SLOW_DOWN_MS)
          .nodeify(done);
      });
    }

    it('should work in relative units', function (done) {
      driver
        .elementsByClassName('UIATableCell').then(function (els) { return els[4]; })
        .then(function (el) {
          var tapOpts = {
            x: 0.5 // in relative width from left
          , y: 0.5 // in relative height from top
          , element: el.value
          };
          return driver
            .execute("mobile: tap", [tapOpts]);
        }).elementByClassName('UIATextView').text()
        .then(function (text) {
          text.should.include(textBlock);
        }).nodeify(done);
    });
    it('should work in pixels', function (done) {
      driver
        .elementsByClassName('UIATableCell').then(function (els) { return els[4]; })
        .then(function (el) {
          var tapOpts = {
            x: 150 // in pixels from left
          , y: 30 // in pixels from top
          , element: el.value
          };
          return driver
            .execute("mobile: tap", [tapOpts]);
        }).elementByClassName('UIATextView').text()
        .then(function (text) {
          text.should.include(textBlock);
        }).nodeify(done);
    });
  });

  describe('scroll to element @skip-ios7', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    if (env.FAST_TESTS) {
      afterEach(function (done) {
        driver
          .flick(0, 100, false)
          .flick(0, 100, false)
          .sleep(SLOW_DOWN_MS)
          .nodeify(done);
      });
    }

    it('should bring the element into view', function (done) {
      var el, scrollOpts, location1;
      driver.elementsByClassName('UIATableCell').then(function (els) {
        el = els[10];
        scrollOpts = { element: el.value };
      })
      .then(function () { return el.getLocation(); })
      .then(function (loc) { location1 = loc; })
      .then(function () {
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).then(function () { return el.getLocation(); })
      .then(function (location2) {
        location2.x.should.equal(location1.x);
        location2.y.should.not.equal(location1.y);
      }).nodeify(done);
    });
  });

  describe('mobile: scroll', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should scroll down and up', function (done) {
      var firstEl, location1, location2;
      driver
      .elementByClassName('UIATableCell')
      .then(function (el) { firstEl = el; return el.getLocation(); })
      .then(function (loc) { location1 = loc; })
      .then(function () {
        return driver.execute("mobile: scroll", [{direction: 'down'}]);
      })
      .then(function () { return firstEl.getLocation(); })
      .then(function (loc2) {
        location2 = loc2;
        loc2.x.should.equal(location1.x);
        loc2.y.should.not.equal(location1.y);
      })
      .then(function () {
        return driver.execute("mobile: scroll", [{direction: 'up'}]);
      })
      .then(function () { return firstEl.getLocation(); })
      .then(function (loc3) {
        loc3.x.should.equal(location2.x);
        loc3.y.should.not.equal(location2.y);
      })
      .nodeify(done);
    });
    it('should scroll down and up using element', function (done) {
      var firstEl, location1, location2, table_view;
      driver.elementByClassName('UIATableView').then(function (el) {
        table_view = el;
      })
      .elementByClassName('UIATableCell')
      .then(function (el) { firstEl = el; return el.getLocation(); })
      .then(function (loc) { location1 = loc; })
      .then(function () {
        return driver.execute("mobile: scroll", [{element: table_view.value, direction: 'down'}]);
      })
      .then(function () { return firstEl.getLocation(); })
      .then(function (loc2) {
        location2 = loc2;
        loc2.x.should.equal(location1.x);
        loc2.y.should.not.equal(location1.y);
      })
      .then(function () {
        return driver.execute("mobile: scroll", [{element: table_view.value, direction: 'up'}]);
      })
      .then(function () { return firstEl.getLocation(); })
      .then(function (loc3) {
        loc3.x.should.equal(location2.x);
        loc3.y.should.not.equal(location2.y);
      })
      .nodeify(done);
    });
  });

  describe('mobile shake', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should not error', function (done) {
      driver.shakeDevice().nodeify(done);
    });
  });

});

