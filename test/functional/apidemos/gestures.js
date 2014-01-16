"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = ".ApiDemos"
  , driverblock = require("../../helpers/driverblock.js")
  , Q = driverblock.Q
  , describeWd = driverblock.describeForApp(appPath,
      "android", appPkg, appAct)
  , it = require("../../helpers/driverblock.js").it;

describeWd('gestures', function(h) {

  if (process.env.FAST_TESTS) {
    afterEach(function(done) {
      // going back to main page if necessary todo: find better way
      function back() {
        return h.driver.elementByNameOrNull('Accessibility').then(function(el) {
          if (!el) return h.driver.back();
        });
      }
      back().then(back).nodeify(done);
    });
  }

  it('should click via x/y pixel coords', function(done) {
    h.driver
      .execute("mobile: tap", [{x: 100, y: 300}])
      .sleep(3000)
      .elementsByTagName("text").then(function(els) { return els[1]; })
        .text().should.become("Action Bar")
      .nodeify(done);
  });
  //todo: not working in nexus 7  
  it(' should click via x/y pct', function(done) {
    // this test depends on having a certain size screen, obviously
    // I use a nexus something or other phone style thingo
    h.driver
      .execute("mobile: tap", [{x: 0.6, y: 0.8}])
      .sleep(3000)
      .elementsByTagName("text").then(function(els) { return els[1]; }).text()
      .then(function(text) {
        ["ForegroundDispatch", "Morse Code"].should.include(text);
      }).nodeify(done);
  });
  it('should click via touch api', function(done) {
    // this test depends on having a certain size screen, obviously
    // I use a nexus something or other phone style thingo
    h.driver.elementByName("Animation").tap()
      .sleep(1500)
      .elementsByTagName("text").then(function(els) { return els[1]; })
        .text().should.become("Bouncing Balls")
      .nodeify(done);
  });
  // todo fix this test, success depends on emulator size
  it('should swipe screen by pixels', function(done) {
    var swipeOpts = {
      startX: 100
      , startY: 500
      , endX: 100
      , endY: 100
      , duration: 1.2
    };
    h.driver
      // .elementByName("Views").should.be.rejected // shouldn't be visible
      .execute("mobile: swipe", [swipeOpts])
      .elementByName("Views").should.eventually.exist
      .nodeify(done);
  });
  // todo fix this test, success depends on emulator size
  it('should swipe screen by pct', function(done) {
    var swipeOpts = {
      endX: 0.5
      , endY: 0.05
      , duration: 0.7
    };
    h.driver
      // .elementByName("Views").should.be.rejected // shouldn't be visible
      .execute("mobile: swipe", [swipeOpts])
      .elementByName("Views").should.eventually.exist
      .nodeify(done);
  });
  // todo fix this test, success depends on emulator size
  it('should flick screen by pixels', function(done) {
    var swipeOpts = {
      startX: 100
      , startY: 500
      , endX: 100
      , endY: 100
    };
    h.driver
      // .elementByName("Views").should.be.rejected // shouldn't be visible
      .execute("mobile: flick", [swipeOpts])
      .elementByName("Views").should.eventually.exist
      .nodeify(done);
  });
  // todo fix this test, success depends on emulator size
  it('should flick screen by speed', function(done) {
    h.driver
      // .elementByName("Views").should.be.rejected // shouldn't be visible
      .flick(0, -100)
      .elementByName("Views").should.eventually.exist
      .nodeify(done);
  });
  // todo fix this test, it is testing nothing on big screens
  it('should drag by pixels', function(done) {
    var scrollOpts;
    h.driver.elementByTagName("listView")
      .then(function(el) {
        scrollOpts = { element: el.value, text: 'Views' };
        return h.driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='Views']").click()
      .then(function() {
        scrollOpts.text = 'Drag and Drop';
        return h.driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='Drag and Drop']").click()
      .then(function() {
        return Q.all([
          h.driver.elementById("com.example.android.apis:id/drag_dot_3").getLocation(),
          h.driver.elementById("com.example.android.apis:id/drag_dot_2").getLocation()
        ]);
      }).then(function(locations) {
        var dragOpts = {
          startX: locations[0].x
          , startY: locations[0].y
          , endX: locations[1].x
          , endY: locations[1].y
        };
        return h.driver.execute("mobile: drag", [dragOpts]);
      }).elementById("com.example.android.apis:id/drag_result_text").text()
        .should.become("Dropped!")
      .nodeify(done);
  });
  // todo fix this test, it is testing nothing on big screens
  it('should drag element to point', function(done) {
    var scrollOpts;
    h.driver
      .elementByTagName("listView")
      .then(function(el) {
        scrollOpts = {
          element: el.value
          , text: 'Views'
        };
        return h.driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='Views']").click()
      .then(function() {
        scrollOpts.text = 'Drag and Drop';
        return h.driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='Drag and Drop']").click()
      .then(function() {
        return Q.all([
          h.driver.elementById("com.example.android.apis:id/drag_dot_3"),
          h.driver.elementById("com.example.android.apis:id/drag_dot_2").getLocation()
        ]);
      }).then(function(res) {
        var dragOpts = {
          element: res[0].value
          , endX: res[1].x
          , endY: res[1].y
        };
        return h.driver.execute("mobile: drag", [dragOpts]);
      }).elementById("com.example.android.apis:id/drag_result_text").text()
        .should.become("Dropped!")
      .nodeify(done);
  });
  // todo fix this test, it is testing nothing on big screens
  it('should drag element to destEl', function(done) {
    var scrollOpts;
    h.driver
      .elementByTagName("listView")
      .then(function(el) {
        scrollOpts = {
          element: el.value
          , text: 'Views'
        };
        return h.driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='Views']").click()
      .then(function() {
        scrollOpts.text = 'Drag and Drop';
        return h.driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='Drag and Drop']").click()
      .then(function() {
        return Q.all([
          h.driver.elementById("com.example.android.apis:id/drag_dot_3"),
          h.driver.elementById("com.example.android.apis:id/drag_dot_2")
        ]);
      }).then(function(els) {
        var dragOpts = {
          element: els[0].value
        , destEl: els[1].value
        };
        return h.driver.execute("mobile: drag", [dragOpts]);
      }).elementById("com.example.android.apis:id/drag_result_text").text()
        .should.become("Dropped!")
      .nodeify(done);
  });
  // todo fix this test, success depends on emulator size
  it('should bring the element into view', function(done) {
    h.driver
      // .elementByName("Views").should.be.rejected // shouldn't be visible
      .elementByTagName("listView")
      .then(function(el) {
        var scrollOpts = {
          element: el.value
          , text: 'Views'
        };
        return h.driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByName("Views").should.eventually.exist
      .nodeify(done);
  });
  it('should pinch out/in', function(done) {
    var scrollOpts;
    h.driver
      .elementByTagName("listView")
      .then(function(el) {
        scrollOpts = {
          element: el.value
          , text: 'Views'
        };
        return h.driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='Views']").click()
      .then(function() {
        scrollOpts.text = 'WebView';
        return h.driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='WebView']").click()
      .elementById("com.example.android.apis:id/wv1")
      .then(function(el) {
        var pinchOpts = {
          element: el.value
          , percent: 200
          , steps: 100
        };
        return h.driver
          .execute("mobile: pinchOpen", [pinchOpts])
          .execute("mobile: pinchClose", [pinchOpts]);
      }).nodeify(done);
  });

});
