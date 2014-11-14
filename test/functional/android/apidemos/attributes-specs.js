"use strict";

var setup = require("../../common/setup-base")
  , desired = require("./desired");

describe("apidemos - attributes", function () {

  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should be able to find resourceId attribute', function (done) {
    driver
      .elementByName('Animation').getAttribute('resourceId')
        .should.become("android:id/text1")
      .nodeify(done);
  });
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
});
