"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , it = require("../../helpers/driverblock.js").it
  , spinWait = require('../../helpers/spin.js').spinWait
  , textBlock = "Now is the time for all good developers to come to serve their country.\n\nNow is the time for all good developers to come to serve their country.\n\nThis text view can also use attributed strings.";

var SLOW_DOWN_MS = 250;

describeWd('gesture', function(h) {
  describe('flick', function() {

    if (process.env.FAST_TESTS) {
      afterEach(function(done) {
        h.driver
          .flick(0, 100, false)
          .sleep(SLOW_DOWN_MS)
          .nodeify(done);
      });
    }

    it('should work via webdriver method', function(done) {
      h.driver
        .elementByTagName('tableCell').getLocation()
        .then(function(location1) {
          return h.driver
            .flick(0, -100, false)
            .elementByTagName('tableCell').getLocation()
            .then(function(location2) {
              location2.x.should.equal(location1.x);
              location2.y.should.not.equal(location1.y);
            });
        }).nodeify(done);
    });
    it('should work via mobile only method', function(done) {
      h.driver
        .elementByTagName('tableCell').getLocation()
        .then(function(location1) {
          return h.driver
            .execute("mobile: flick", [{endX: 0, endY: 0}])
            .elementByTagName('tableCell').getLocation()
            .then(function(location2) {
              location2.x.should.equal(location1.x);
              location2.y.should.not.equal(location1.y);
            });
        }).nodeify(done);
    });
    it('should not complete instantaneously', function(done) {
      var start = Date.now();
      h.driver
        .execute("mobile: flick", [{endX: 0, endY: 0}])
        .then(function() { (Date.now() - start).should.be.above(2500); })
        .nodeify(done);
    });
    it('should work via mobile only method with percentage', function(done) {
      var opts = {startX: 0.75, startY: 0.75, endX: 0.25, endY: 0.25};
      h.driver
        .elementByTagName('tableCell').getLocation()
        .then(function(location1) {
          return h.driver
            .execute("mobile: flick", [opts])
            .elementByTagName('tableCell').getLocation()
            .then(function(location2) {
              location2.x.should.equal(location1.x);
              location2.y.should.not.equal(location1.y);
            });
        }).nodeify(done);
    });
  });
  describe('swipe gesture', function() {

    if (process.env.FAST_TESTS) {
      afterEach(function(done) {
        h.driver
          .flick(0, 100, false)
          .sleep(SLOW_DOWN_MS)
          .nodeify(done);
      });
    }

    it('should work with wd function in pixels', function(done) {
      h.driver
        .elementByTagName('tableCell').getLocation()
        .then(function(location1) {
          return spinWait(function() {
            return h.driver
              .flick(0, -70, true)
              .elementByTagName('tableCell').getLocation()
              .then(function(location2) {
                ( (location2.x === location1.x) &&
                  (location2.y !== location1.y)
                ).should.be.ok;
              });
          }, 5000);

        }).nodeify(done);
    });
    it('should work with wd function in percentage units', function(done) {
      h.driver
        .elementByTagName('tableCell').getLocation()
        .then(function(location1) {
          return h.driver
            .flick(0, -0.15, true)
            .elementByTagName('tableCell').getLocation()
            .then(function(location2) {
              location2.x.should.equal(location1.x);
              location2.y.should.not.equal(location1.y);
            });
        }).nodeify(done);
    });
    it('should work with mobile function in pixels', function(done) {
      var opts = {startX: 50, startY: 400, endX: 50, endY: 300, duration: 2};
      h.driver
        .elementByTagName('tableCell').getLocation()
        .then(function(location1) {
          return spinWait(function() {
            return h.driver
              .execute("mobile: swipe", [opts])
              .elementByTagName('tableCell').getLocation()
              .then(function(location2) {
                location2.x.should.equal(location1.x);
                location2.y.should.not.equal(location1.y);
              });
          });
        }).nodeify(done);
    });
    it('should work with mobile function in percent', function(done) {
      var opts = {startX: 0.5, startY: 0.9, endX: 0.5, endY: 0.7, duration: 2};
      h.driver
        .elementByTagName('tableCell').getLocation()
        .then(function(location1) {
          return spinWait(function() {
            return h.driver
              .execute("mobile: swipe", [opts])
              .elementByTagName('tableCell').getLocation()
              .then(function(location2) {
                location2.x.should.equal(location1.x);
                location2.y.should.not.equal(location1.y);
              });
          });
        }).nodeify(done);
    });
    it('should not complete instantaneously', function(done) {
      var start = Date.now();
      var opts = {startX: 0.5, startY: 0.9, endX: 0.5, endY: 0.7, duration: 2};
      h.driver
        .execute("mobile: swipe", [opts])
        .then(function() {
          (Date.now() - start).should.be.above(1999);
        }).nodeify(done);
    });
  });

  describe("flick element", function() {

    if (process.env.FAST_TESTS) {
      afterEach(function(done) {
        h.driver
          .elementByTagName("slider")
          .then(function(el) { if (el) return el.sendKeys(0.5); })
          .elementByNameOrNull('Back')
          .then(function(el) { if (el) return el.click(); })
          .sleep(SLOW_DOWN_MS)
          .nodeify(done);
      });
    }

    it("slider value should change", function(done) {
      var valueBefore, slider;
      h.driver
        .elementsByTagName("tableCell").then(function(els) { return els[1]; })
        .click()
        .elementByTagName("slider").then(function(el) { slider = el; })
        .then(function() { return slider.getAttribute("value"); })
        .then(function(value) { valueBefore = value; })
        .then(function() { return slider.flick(-0.5, 0, 1); })
        .then(function() { return slider.getAttribute("value"); })
        .then(function(valueAfter) {
          valueBefore.should.equal("50%");
          valueAfter.should.equal("0%");
        }).nodeify(done);
    });
    it("should work with mobile flick", function(done) {
      var valueBefore, slider;
      h.driver
        .elementsByTagName("tableCell").then(function(els) { return els[1]; })
        .click()
        .elementByTagName("slider").then(function(el) { slider = el; })
        .then(function() { return slider.getAttribute("value"); })
        .then(function(value) { valueBefore = value; })
        .then(function() {
          var opts = {element: slider.value, endX: -50, endY: 0};
          return h.driver.execute("mobile: flick", [opts]);
        })
        .then(function() { return slider.getAttribute("value"); })
        .then(function(valueAfter) {
          valueBefore.should.equal("50%");
          valueAfter.should.equal("0%");
        }).nodeify(done);
    });
    it("should work with mobile flick and percent", function(done) {
      var valueBefore, slider;
      h.driver
        .elementsByTagName("tableCell").then(function(els) { return els[1]; })
        .click()
        .elementByTagName("slider").then(function(el) { slider = el; })
        .then(function() { return slider.getAttribute("value"); })
        .then(function(value) { valueBefore = value; })
        .then(function() {
          var opts = {element: slider.value, startX: 0.5, startY: 0.0,
            endX: 0.0, endY: 0.0};
          return h.driver.execute("mobile: flick", [opts]);
        })
        .then(function() { return slider.getAttribute("value"); })
        .then(function(valueAfter) {
          valueBefore.should.equal("50%");
          valueAfter.should.equal("0%");
        }).nodeify(done);
    });
  });
  describe("swipe element", function() {

    if (process.env.FAST_TESTS) {
      afterEach(function(done) {
        h.driver
          .elementByTagName("slider")
          .then(function(el) { if (el) return el.sendKeys(0.5); })
          .elementByNameOrNull('Back')
          .then(function(el) { if (el) return el.click(); })
          .sleep(SLOW_DOWN_MS)
          .nodeify(done);
      });
    }

    it("slider value should change", function(done) {
      var valueBefore, slider;
      h.driver
        .elementsByTagName("tableCell").then(function(els) { return els[1]; })
        .click()
        .elementByTagName("slider").then(function(el) { slider = el; })
        .then(function() { return slider.getAttribute("value"); })
        .then(function(value) { valueBefore = value; })
        .then(function() {
          var opts = {startX: 0.5, startY: 0.5, endX: 0.25, endY: 0.5,
            duration: 0.3, element: slider.value};
          return h.driver.execute("mobile: swipe", [opts]);
        })
        .then(function() { return slider.getAttribute("value"); })
        .then(function(valueAfter) {
          valueBefore.should.equal("50%");
          valueAfter.should.equal("20%");
        }).nodeify(done);
    });
    it("slider value should change by pixels", function(done) {
      var valueBefore, slider;
      h.driver
        .elementsByTagName("tableCell").then(function(els) { return els[1]; })
        .click()
        .elementByTagName("slider").then(function(el) { slider = el; })
        .then(function() { return slider.getAttribute("value"); })
        .then(function(value) { valueBefore = value; })
        .then(function() {
          var opts = {endX: 15, endY: 10, duration: 0.3, element: slider.value};
          return h.driver.execute("mobile: swipe", [opts]);
        })
        .then(function() { return slider.getAttribute("value"); })
        .then(function(valueAfter) {
          valueBefore.should.equal("50%");
          valueAfter.should.equal("5%");
        }).nodeify(done);
    });
  });
  describe('complex tap', function() {
    if (process.env.FAST_TESTS) {
      afterEach(function(done) {
        h.driver
          .elementByNameOrNull('Back')
          .then(function(el) { if (el) return el.click(); })
          .sleep(SLOW_DOWN_MS)
          .nodeify(done);
      });
    }

    it('should work with custom options', function(done) {
      var tapOpts = {
        tapCount: 1 // how many taps
        , duration: 2.3 // how long
        , touchCount: 3 // how many fingers
        , x: 100 // in pixels from left
        , y: 250 // in pixels from top
      };
      h.driver
        .execute("mobile: tap", [tapOpts])
        .elementByTagName("textview").text()
        .then(function(text) {
          textBlock.should.include(text);
        })
        .nodeify(done);
    });
    it('should work in relative units', function(done) {
      var tapOpts = {
        tapCount: 1 // how many taps
        , duration: 2.3 // how long
        , touchCount: 3 // how many fingers
        , x: 0.5 // 50% from left of screen
        , y: 0.55 // 55% from top of screen
      };
      h.driver
        .execute("mobile: tap", [tapOpts])
        .elementByTagName("textview").text()
        .then(function(text) {
          textBlock.should.include(text);
        })
        .nodeify(done);
    });
    it('should work with default options', function(done) {
      h.driver
        .execute("mobile: tap")
        .elementByTagName("textview").text()
        .then(function(text) {
          textBlock.should.include(text);
        })
        .nodeify(done);
    });
  });
  describe('complex tap on element', function() {
    if (process.env.FAST_TESTS) {
      afterEach(function(done) {
        h.driver
          .elementByNameOrNull('Back')
          .then(function(el) { if (el) return el.click(); })
          .sleep(SLOW_DOWN_MS)
          .nodeify(done);
      });
    }

    it('should work in relative units', function(done) {
      h.driver
        .elementsByTagName('tableCell').then(function(els) { return els[4]; })
        .then(function(el) {
          var tapOpts = {
            x: 0.5 // in relative width from left
            , y: 0.5 // in relative height from top
            , element: el.value
          };
          return h.driver
            .execute("mobile: tap", [tapOpts]);
        }).elementByTagName("textview").text()
        .then(function(text) {
          textBlock.should.include(text);
        }).nodeify(done);
    });
    it('should work in pixels', function(done) {
      h.driver
        .elementsByTagName('tableCell').then(function(els) { return els[4]; })
        .then(function(el) {
          var tapOpts = {
            x: 150 // in pixels from left
            , y: 30 // in pixels from top
            , element: el.value
          };
          return h.driver
            .execute("mobile: tap", [tapOpts]);
        }).elementByTagName("textview").text()
        .then(function(text) {
          textBlock.should.include(text);
        }).nodeify(done);
    });
  });

  describe('scroll to element', function() {
    if (process.env.FAST_TESTS) {
      afterEach(function(done) {
        h.driver
          .flick(0, 100, false)
          .sleep(SLOW_DOWN_MS)
          .nodeify(done);
      });
    }
    
    it('should bring the element into view', function(done) {
      var el, scrollOpts, location1;
      h.driver.elementsByTagName('tableCell').then(function(els) {
        el = els[10];
        scrollOpts = { element: el.value };
      })
      .then(function() { return el.getLocation(); })
      .then(function(loc) { location1 = loc; })
      .then(function() {
        return h.driver.execute("mobile: scrollTo", [scrollOpts]); })
      .then(function() { return el.getLocation(); })
      .then(function(location2) {
        location2.x.should.equal(location1.x);
        location2.y.should.not.equal(location1.y);
      }).nodeify(done);
    });
  });

  describe('mobile shake', function() {

    it('should not error', function(done) {
      h.driver.execute('mobile: shake')
        .nodeify(done);
    });
  });

});

