"use strict";

var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base")
  , desired = require("./desired")
  , Q = require("q");

describe("apidemo - gestures -", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function (done) {
      driver.execute("mobile: reset")
        .then(function () { return driver.sleep(3000); })
        .nodeify(done);
    });
  }

  it('should click via x/y pixel coords', function (done) {
    driver
      .execute("mobile: tap", [{x: 100, y: 300}])
      .sleep(3000)
      .elementsByTagName("text").then(function (els) { return els[1]; })
        .text().should.become("Action Bar")
      .nodeify(done);
  });
  //todo: not working in nexus 7
  it('should click via x/y pct', function (done) {
    // this test depends on having a certain size screen, obviously
    // I use a nexus something or other phone style thingo
    driver
      .execute("mobile: tap", [{x: 0.6, y: 0.8}])
      .sleep(3000)
      .elementsByTagName("text").then(function (els) { return els[1]; }).text()
      .then(function (text) {
        ["ForegroundDispatch", "Morse Code"].should.include(text);
      }).nodeify(done);
  });
  it('should click via touch api', function (done) {
    // this test depends on having a certain size screen, obviously
    // I use a nexus something or other phone style thingo
    driver.elementByName("Animation").tap()
      .sleep(1500)
      .elementsByTagName("text").then(function (els) { return els[1]; })
        .text().should.become("Bouncing Balls")
      .nodeify(done);
  });
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
  // todo fix this: got Error response status: 13, The swipe did not complete successfully
  it('should flick screen by pixels @skip-android-all', function (done) {
    var swipeOpts = {
      startX: 100
    , startY: 500
    , endX: 100
    , endY: 100
    };
    driver
      .elementByName("Views").should.be.rejected // shouldn't be visible
      .execute("mobile: flick", [swipeOpts])
      .elementByName("Views").should.eventually.exist
      .nodeify(done);
  });
  // todo fix this: got Error response status: 13, Flick did not complete successfully
  it('should flick screen by speed @skip-android-all', function (done) {
    driver
      .elementByName("Views").should.be.rejected // shouldn't be visible
      .flick(0, -100)
      .elementByName("Views").should.eventually.exist
      .nodeify(done);
  });
  // todo fix this: got Error response status: 13, Could not scroll element into view: Views
  it('should drag by pixels @skip-android-all', function (done) {
    var scrollOpts;
    driver.elementByTagName("listView")
      .then(function (el) {
        scrollOpts = { element: el.value, text: 'Views' };
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='Views']").click()
      .then(function () {
        scrollOpts.text = 'Drag and Drop';
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='Drag and Drop']").click()
      .then(function () {
        return Q.all([
          driver.elementById("com.example.android.apis:id/drag_dot_3").getLocation(),
          driver.elementById("com.example.android.apis:id/drag_dot_2").getLocation()
        ]);
      }).then(function (locations) {
        var dragOpts = {
          startX: locations[0].x
        , startY: locations[0].y
        , endX: locations[1].x
        , endY: locations[1].y
        };
        return driver.execute("mobile: drag", [dragOpts]);
      }).elementById("com.example.android.apis:id/drag_result_text").text()
        .should.become("Dropped!")
      .nodeify(done);
  });
  // todo fix this: got Error response status: 13, Could not scroll element into view: Views
  it('should drag element to point @skip-android-all', function (done) {
    var scrollOpts;
    driver
      .elementByTagName("listView")
      .then(function (el) {
        scrollOpts = {
          element: el.value
        , text: 'Views'
        };
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='Views']").click()
      .then(function () {
        scrollOpts.text = 'Drag and Drop';
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='Drag and Drop']").click()
      .then(function () {
        return Q.all([
          driver.elementById("com.example.android.apis:id/drag_dot_3"),
          driver.elementById("com.example.android.apis:id/drag_dot_2").getLocation()
        ]);
      }).then(function (res) {
        var dragOpts = {
          element: res[0].value
        , endX: res[1].x
        , endY: res[1].y
        };
        return driver.execute("mobile: drag", [dragOpts]);
      }).elementById("com.example.android.apis:id/drag_result_text").text()
        .should.become("Dropped!")
      .nodeify(done);
  });
  // todo fix this: got Error response status: 13, Could not scroll element into view: Views
  it('should drag element to destEl @skip-android-all', function (done) {
    var scrollOpts;
    driver
      .elementByTagName("listView")
      .then(function (el) {
        scrollOpts = {
          element: el.value
        , text: 'Views'
        };
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='Views']").click()
      .then(function () {
        scrollOpts.text = 'Drag and Drop';
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='Drag and Drop']").click()
      .then(function () {
        return Q.all([
          driver.elementById("com.example.android.apis:id/drag_dot_3"),
          driver.elementById("com.example.android.apis:id/drag_dot_2")
        ]);
      }).then(function (els) {
        var dragOpts = {
          element: els[0].value
        , destEl: els[1].value
        };
        return driver.execute("mobile: drag", [dragOpts]);
      }).elementById("com.example.android.apis:id/drag_result_text").text()
        .should.become("Dropped!")
      .nodeify(done);
  });
  // todo fix this: got Error response status: 13, Could not scroll element into view: Views
  it('should bring the element into view @skip-android-all', function (done) {
    driver
      // .elementByName("Views").should.be.rejected // shouldn't be visible
      .elementByTagName("listView")
      .then(function (el) {
        var scrollOpts = {
          element: el.value
        , text: 'Views'
        };
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByName("Views").should.eventually.exist
      .nodeify(done);
  });
  // todo fix this: got Error response status: 13, Could not scroll element into view: Views
  it('should pinch out/in @skip-android-all', function (done) {
    var scrollOpts;
    driver
      .elementByTagName("listView")
      .then(function (el) {
        scrollOpts = {
          element: el.value
        , text: 'Views'
        };
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='Views']").click()
      .then(function () {
        scrollOpts.text = 'WebView';
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='WebView']").click()
      .elementById("com.example.android.apis:id/wv1")
      .then(function (el) {
        var pinchOpts = {
          element: el.value
        , percent: 200
        , steps: 100
        };
        return driver
          .execute("mobile: pinchOpen", [pinchOpts])
          .execute("mobile: pinchClose", [pinchOpts]);
      }).nodeify(done);
  });

  it('should long click via element value', function (done) {
    var element;

    driver
      .elementsByTagName("text").then(function (els) { element = els[1]; })
      .then(function () { driver.execute("mobile: longClick", [{element: element.value}]); })
      .sleep(3000)
      .elementsByTagName("text").then(function (els) { return els[1]; }).text()
      .then(function (text) {
        ["Accessibility Node Provider"].should.include(text);
      }).nodeify(done);
  });

  it('should long click via element value with custom duration', function (done) {
    var element;

    driver
      .elementsByTagName("text").then(function (els) { element = els[1]; })
      .then(function () { driver.execute("mobile: longClick", [{element: element.value, duration: 1000}]); })
      .sleep(3000)
      .elementsByTagName("text").then(function (els) { return els[1]; }).text()
      .then(function (text) {
        ["Accessibility Node Provider"].should.include(text);
      }).nodeify(done);
  });

  it('should long click via pixel value', function (done) {
    var element, location, elSize;

    driver
      .elementsByTagName("text").then(function (els) { element = els[1]; })
      .then(function () { return element.getLocation(); })
      .then(function (loc) { location = loc; })
      .then(function () { return element.getSize(); })
      .then(function (size) { elSize = size; })
      .then(function () {
        var centerX = location.x + (elSize.width / 2);
        var centerY = location.y + (elSize.height / 2);
        driver.execute("mobile: longClick", [{x: centerX, y: centerY}]);
      })
      .sleep(3000)
      .elementsByTagName("text").then(function (els) { return els[1]; }).text()
      .then(function (text) {
        ["Accessibility Node Provider"].should.include(text);
      }).nodeify(done);
  });

  it('should long click via relative value', function (done) {
    var element, location, elSize, windowSize;

    driver
      .elementsByTagName("text").then(function (els) { element = els[1]; })
      .then(function () { return element.getLocation(); })
      .then(function (loc) { location = loc; })
      .then(function () { return element.getSize(); })
      .then(function (size) { elSize = size; })
      .then(function () { return driver.getWindowSize(); })
      .then(function (size) { windowSize = size; })
      .then(function () {
        var relX = (location.x + (elSize.width / 2)) / windowSize.width;
        var relY = (location.y + (elSize.height / 2)) / windowSize.height;
        driver.execute("mobile: longClick", [{x: relX, y: relY}]);
      })
      .sleep(3000)
      .elementsByTagName("text").then(function (els) { return els[1]; }).text()
      .then(function (text) {
        ["Accessibility Node Provider"].should.include(text);
      }).nodeify(done);
  });

  it('should execute down/move/up via element value', function (done) {
    var element;

    driver
      .elementsByTagName("text").then(function (els) { element = els[1]; })
      .then(function () { driver.execute("mobile: down", [{element: element.value}]); })
      .sleep(3000)
      .then(function () { driver.execute("mobile: move", [{element: element.value}]); })
      .sleep(3000)
      .then(function () { driver.execute("mobile: up", [{element: element.value}]); })
      .sleep(3000)
      .elementsByTagName("text").then(function (els) { return els[1]; }).text()
      .then(function (text) {
        ["Accessibility Node Provider"].should.include(text);
      }).nodeify(done);
  });

  it('should execute down/move/up click via pixel value', function (done) {
    var element, location, elSize, centerX, centerY;

    driver
      .elementsByTagName("text").then(function (els) { element = els[1]; })
      .then(function () { return element.getLocation(); })
      .then(function (loc) { location = loc; })
      .then(function () { return element.getSize(); })
      .then(function (size) { elSize = size; })
      .then(function () {
        centerX = location.x + (elSize.width / 2);
        centerY = location.y + (elSize.height / 2);
        driver.execute("mobile: down", [{x: centerX, y: centerY}]);
      })
      .sleep(3000)
      .then(function () { driver.execute("mobile: move", [{x: centerX, y: centerY}]); })
      .sleep(3000)
      .then(function () { driver.execute("mobile: up", [{x: centerX, y: centerY}]); })
      .sleep(3000)
      .elementsByTagName("text").then(function (els) { return els[1]; }).text()
      .then(function (text) {
        ["Accessibility Node Provider"].should.include(text);
      }).nodeify(done);
  });

  it('should execute down/move/up via relative value', function (done) {
    var element, location, elSize, windowSize, relX, relY;

    driver
      .elementsByTagName("text").then(function (els) { element = els[1]; })
      .then(function () { return element.getLocation(); })
      .then(function (loc) { location = loc; })
      .then(function () { return element.getSize(); })
      .then(function (size) { elSize = size; })
      .then(function () { return driver.getWindowSize(); })
      .then(function (size) { windowSize = size; })
      .then(function () {
        relX = (location.x + (elSize.width / 2)) / windowSize.width;
        relY = (location.y + (elSize.height / 2)) / windowSize.height;
        driver.execute("mobile: down", [{x: relX, y: relY}]);
      })
      .sleep(3000)
      .then(function () { driver.execute("mobile: move", [{x: relX, y: relY}]); })
      .sleep(3000)
      .then(function () { driver.execute("mobile: up", [{x: relX, y: relY}]); })
      .sleep(3000)
      .elementsByTagName("text").then(function (els) { return els[1]; }).text()
      .then(function (text) {
        ["Accessibility Node Provider"].should.include(text);
      }).nodeify(done);
  });
});
