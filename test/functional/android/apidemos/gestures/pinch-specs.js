"use strict";

var setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , droidText = 'android.widget.TextView'
  , droidList = 'android.widget.ListView';

describe("apidemo - gestures - pinch", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  // todo fix this: got Error response status: 13, Could not scroll element into view: Views
  it('should pinch out/in @skip-android-all', function (done) {
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
        scrollOpts.text = 'WebView';
        return driver.execute("mobile: scrollTo", [scrollOpts]);
      }).elementByXPath("//" + droidText + "[@value='WebView']").click()
      .elementById("io.appium.android.apis:id/wv1")
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
});
