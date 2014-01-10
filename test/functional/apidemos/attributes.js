"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = ".ApiDemos"
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath,
      "android", appPkg, appAct)
  , it = require("../../helpers/driverblock.js").it;

describeWd('get attribute', function(h) {
  if (process.env.FAST_TESTS) {
    afterEach(function(done) {
      // going back to main page if necessary todo: find better way
      h.driver.elementByNameOrNull('Accessibility').then(function(el) {
        if (!el) return h.driver.back();
      }).nodeify(done);
    });
  }
  
  it('should be able to find text attribute', function(done) {
    h.driver
      .elementByName('Animation').getAttribute('text')
        .should.become("Animation")
      .nodeify(done);
  });
  it('should be able to find name attribute', function(done) {
    h.driver.elementByName('Animation').getAttribute('name')
        .should.become("Animation")
      .nodeify(done);
  });
  it('should be able to find name attribute, falling back to text', function(done) {
    h.driver
      .elementByName('Animation').click()
      .elementsByTagName('text')
      .then(function(els) { return els[1].getAttribute('name'); })
        .should.become("Bouncing Balls")
      .back()
      .nodeify(done);
  });
  it('should be able to find displayed attribute', function(done) {
    h.driver
      .elementByName('Animation').getAttribute('displayed')
        .should.become('true')
      .nodeify(done);
  });
  it('should be able to find displayed attribute through normal func', function(done) {
    h.driver
      .elementByName('Animation').isDisplayed()
        .should.become(true)
      .nodeify(done);
  });
  it('should be able to get element location', function(done) {
    h.driver
      .elementByName('Animation').getLocation()
      .then(function(loc) {
        loc.x.should.be.at.least(0);
        loc.y.should.be.at.least(0);
      }).nodeify(done);
  });
  it('should be able to get element size', function(done) {
    h.driver
      .elementByName('Animation').getSize()
      .then(function(size) {
        size.width.should.be.at.least(0);
        size.height.should.be.at.least(0);
      }).nodeify(done);
  });
  // TODO: tests for checkable, checked, clickable, focusable, focused,
  // longClickable, scrollable, selected

  it('should be able to get selected value of a tab', function(done) {
    h.driver
      .execute("mobile: find", [["scroll",[[3, "views"]],[[7, "views"]]]]).click()
      .execute("mobile: find", [["scroll",[[3, "tabs"]],[[7, "tabs"]]]]).click()
      .execute("mobile: find", [["scroll",[[3, "content by id"]],[[7, "content by id"]]]]).click()
      .elementsByTagName("text").then(function(els) {
        els[0].getAttribute('selected').should.become('false'); // the 1st text is not selected
        els[1].getAttribute('selected').should.become('true'); // tab 1 is selected
      }).nodeify(done);
  });
});
