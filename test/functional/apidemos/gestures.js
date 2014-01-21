"use strict";

var env = require('../../helpers/env')
  , setup = require("../common/setup-base")
  , desired = require("./desired")
  , androidReset = require('../../helpers/reset-utils').androidReset
  , Q = require("q");

describe("apidemo - gestures -", function() {
  var driver;
  setup(this, desired).then( function(d) { driver = d; } );

  if (env.FAST_TESTS) {
    beforeEach(function(done) {
      androidReset(desired['app-package'], desired['app-activity']).nodeify(done);
    });
  }

  it('should click via x/y pixel coords', function(done) {
    driver
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
    driver
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
    driver.elementByName("Animation").tap()
      .sleep(1500)
      .elementsByTagName("text").then(function(els) { return els[1]; })
        .text().should.become("Bouncing Balls")
      .nodeify(done);
  });
  // todo fix this: got Error response status: 13, The swipe did not complete successfully
  it('should swipe screen by pixels @skip-all-android', function(done) {
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
  it('should swipe screen by pct @skip-all-android', function(done) {
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
  it('should flick screen by pixels @skip-all-android', function(done) {
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
  it('should flick screen by speed @skip-all-android', function(done) {
    driver
      .elementByName("Views").should.be.rejected // shouldn't be visible
      .flick(0, -100)
      .elementByName("Views").should.eventually.exist
      .nodeify(done);
  });
  // todo fix this: got Error response status: 13, Could not scroll element into view: Views
  it('should drag by pixels @skip-all-android', function(done) {
    var scrollOpts;
    driver.elementByTagName("listView")
      .then(function(el) {
        scrollOpts = { element: el.value, text: 'Views' };
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='Views']").click()
      .then(function() {
        scrollOpts.text = 'Drag and Drop';
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='Drag and Drop']").click()
      .then(function() {
        return Q.all([
          driver.elementById("com.example.android.apis:id/drag_dot_3").getLocation(),
          driver.elementById("com.example.android.apis:id/drag_dot_2").getLocation()
        ]);
      }).then(function(locations) {
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
  it('should drag element to point @skip-all-android', function(done) {
    var scrollOpts;
    driver
      .elementByTagName("listView")
      .then(function(el) {
        scrollOpts = {
          element: el.value
          , text: 'Views'
        };
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='Views']").click()
      .then(function() {
        scrollOpts.text = 'Drag and Drop';
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='Drag and Drop']").click()
      .then(function() {
        return Q.all([
          driver.elementById("com.example.android.apis:id/drag_dot_3"),
          driver.elementById("com.example.android.apis:id/drag_dot_2").getLocation()
        ]);
      }).then(function(res) {
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
  it('should drag element to destEl @skip-all-android', function(done) {
    var scrollOpts;
    driver
      .elementByTagName("listView")
      .then(function(el) {
        scrollOpts = {
          element: el.value
          , text: 'Views'
        };
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='Views']").click()
      .then(function() {
        scrollOpts.text = 'Drag and Drop';
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='Drag and Drop']").click()
      .then(function() {
        return Q.all([
          driver.elementById("com.example.android.apis:id/drag_dot_3"),
          driver.elementById("com.example.android.apis:id/drag_dot_2")
        ]);
      }).then(function(els) {
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
  it('should bring the element into view @skip-all-android', function(done) {
    driver
      // .elementByName("Views").should.be.rejected // shouldn't be visible
      .elementByTagName("listView")
      .then(function(el) {
        var scrollOpts = {
          element: el.value
          , text: 'Views'
        };
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByName("Views").should.eventually.exist
      .nodeify(done);
  });
  // todo fix this: got Error response status: 13, Could not scroll element into view: Views
  it('should pinch out/in @skip-all-android', function(done) {
    var scrollOpts;
    driver
      .elementByTagName("listView")
      .then(function(el) {
        scrollOpts = {
          element: el.value
          , text: 'Views'
        };
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='Views']").click()
      .then(function() {
        scrollOpts.text = 'WebView';
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//text[@value='WebView']").click()
      .elementById("com.example.android.apis:id/wv1")
      .then(function(el) {
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

});
