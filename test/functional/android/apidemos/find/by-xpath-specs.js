"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , atv = 'android.widget.TextView'
  , alv = 'android.widget.ListView';

describe("apidemo - find - by xpath", function () {

  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function (done) {
      driver.resetApp().nodeify(done);
    });
  }

  var f = "android.widget.FrameLayout";
  var l = alv;
  var t = atv;
  it('should find element by type', function (done) {
    driver
      .elementByXPath('//' + t).text()
        .should.become("API Demos")
      .nodeify(done);
  });
  it('should find element by text', function (done) {
    driver
      .elementByXPath("//" + t + "[@text='Accessibility']").text()
        .should.become("Accessibility")
      .nodeify(done);
  });
  it('should find element by partial text', function (done) {
    driver
      .elementByXPath("//" + t + "[contains(@text, 'Accessibility')]").text()
        .should.become("Accessibility")
      .nodeify(done);
  });
  it('should find the last element', function (done) {
    driver
      .elementByXPath("//" + t + "[last()]").text()
      .then(function (text) {
        ["OS", "Text", "Views"].should.include(text);
      }).nodeify(done);
  });
  it('should find element by xpath index and child', function (done) {
    driver
      .elementByXPath("//" + f + "[1]/" + l + "[1]/" + t + "[3]").text()
        .should.become("App")
      .nodeify(done);
  });
  it('should find element by index and embedded desc', function (done) {
    driver
      .elementByXPath("//" + f + "//" + t + "[4]").text()
        .should.become("App")
      .nodeify(done);
  });
});
