"use strict";

var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base")
  , desired = require("./desired");

describe("apidemos - attributes", function () {

  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function (done) {
      driver.resetApp().nodeify(done);
    });
  }

  it('should be able to find text attribute', function (done) {
    driver
      .elementByName('Animation').getAttribute('text')
        .should.become("Animation")
      .nodeify(done);
  });
  it('should be able to find name attribute', function (done) {
    driver.elementByName('Animation').getAttribute('name')
        .should.become("Animation")
      .nodeify(done);
  });
  it('should be able to find name attribute, falling back to text', function (done) {
    driver
      .elementByName('Animation').click()
      .elementsByClassName('android.widget.TextView')
      .then(function (els) { return els[1].getAttribute('name'); })
        .should.become("Bouncing Balls")
      .back()
      .nodeify(done);
  });
  it('should be able to find displayed attribute', function (done) {
    driver
      .elementByName('Animation').getAttribute('displayed')
        .should.become('true')
      .nodeify(done);
  });
  it('should be able to find displayed attribute through normal func', function (done) {
    driver
      .elementByName('Animation').isDisplayed()
        .should.become(true)
      .nodeify(done);
  });
  it('should be able to get element location', function (done) {
    driver
      .elementByName('Animation').getLocation()
      .then(function (loc) {
        loc.x.should.be.at.least(0);
        loc.y.should.be.at.least(0);
      }).nodeify(done);
  });
  it('should be able to get element size', function (done) {
    driver
      .elementByName('Animation').getSize()
      .then(function (size) {
        size.width.should.be.at.least(0);
        size.height.should.be.at.least(0);
      }).nodeify(done);
  });
  // TODO: tests for checkable, checked, clickable, focusable, focused,
  // longClickable, scrollable, selected

  // TODO: fix that, the second scroll doesn't scroll far enough.
  it('should be able to get selected value of a tab @skip-android-all', function (done) {
    driver
      .complexFind(["scroll", [[3, "views"]], [[7, "views"]]]).click()
      .complexFind(["scroll", [[3, "tabs"]], [[7, "tabs"]]]).click()
      .complexFind(["scroll", [[3, "content by id"]], [[7, "content by id"]]]).click()
      .elementsByClassName("android.widget.TextView").then(function (els) {
        els[0].getAttribute('selected').should.become('false'); // the 1st text is not selected
        els[1].getAttribute('selected').should.become('true'); // tab 1 is selected
      }).nodeify(done);
  });
});
