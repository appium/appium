"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , droidText = 'android.widget.TextView'
  , droidList = 'android.widget.ListView'
  , Q = require("q");

describe("apidemo - gestures - drag", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function (done) {
      driver.resetApp()
        .then(function () { return driver.sleep(3000); })
        .nodeify(done);
    });
  }

  // todo fix this: got Error response status: 13, Could not scroll element into view: Views
  it('should drag by pixels @skip-android-all', function (done) {
    var scrollOpts;
    driver.elementByClassName(droidList)
      .then(function (el) {
        scrollOpts = { element: el.value, text: 'Views' };
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//" + droidText + "[@value='Views']").click()
      .then(function () {
        scrollOpts.text = 'Drag and Drop';
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//" + droidText + "[@value='Drag and Drop']").click()
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
      .elementByClassName(droidList)
      .then(function (el) {
        scrollOpts = {
          element: el.value
        , text: 'Views'
        };
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//" + droidText + "[@value='Views']").click()
      .then(function () {
        scrollOpts.text = 'Drag and Drop';
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//" + droidText + "[@value='Drag and Drop']").click()
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
      .elementByClassName(droidList)
      .then(function (el) {
        scrollOpts = {
          element: el.value
        , text: 'Views'
        };
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//" + droidText + "[@value='Views']").click()
      .then(function () {
        scrollOpts.text = 'Drag and Drop';
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//" + droidText + "[@value='Drag and Drop']").click()
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
});
