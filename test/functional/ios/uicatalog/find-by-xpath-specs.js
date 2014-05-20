"use strict";

var setup = require("../../common/setup-base")
  , desired = require('././desired')
  , Q = require("q")
  , _ = require("underscore")
  , spinWait = require("../../../helpers/spin.js").spinWait;

describe('uicatalog - find by xpath', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  var setupXpath = function (driver) {
    return driver.elementByXPath("//UIAStaticText[contains(@label,'Buttons')]")
      .click();
  };

  if (process.env.FAST_TESTS) {
    afterEach(function (done) {
      driver
        .clickButton('UICatalog')
        .nodeify(done);
    });
  }

  it('should return the last button', function (done) {
    driver
      .resolve(setupXpath(driver))
      .elementByXPath("//UIAButton[last()]").text()
        .should.become("Button") // this is the name of the last button
      .nodeify(done);
  });
  it('should return a single element', function (done) {
    driver
      .resolve(setupXpath(driver))
      .elementByXPath("//UIAButton").text()
        .should.become("UICatalog")
      .nodeify(done);
  });
  it('should return multiple elements', function (done) {
    driver
      .resolve(setupXpath(driver))
      .elementsByXPath("//UIAButton")
        .should.eventually.have.length.above(5)
      .nodeify(done);
  });
  it('should filter by name', function (done) {
    driver
      .resolve(setupXpath(driver))
      .elementByXPath("//UIAButton[@name='X Button']").text()
        .should.become("X Button")
      .nodeify(done);
  });
  it('should know how to restrict root-level elements', function (done) {
    driver
      .resolve(setupXpath(driver))
      .elementByXPath("/UIAButton")
        .should.be.rejectedWith(/status: 7/)
      .nodeify(done);
  });
  it('should search an extended path by child', function (done) {
    driver
      .resolve(setupXpath(driver))
      .then(function () {
        return spinWait(function () {
          return driver.elementByXPath("//UIANavigationBar/UIAStaticText")
            .text().should.become('Buttons');
        });
      }).nodeify(done);
  });
  it('should search an extended path by descendant', function (done) {
    driver
      .resolve(setupXpath(driver))
      .elementsByXPath("//UIATableCell//UIAButton").then(function (els) {
        return Q.all(_(els).map(function (el) { return el.text(); }));
      }).then(function (texts) {
        texts.should.not.include("UICatalog");
        texts.should.include("X Button");
      }).nodeify(done);
  });
  it('should filter by indices', function (done) {
    driver
      .resolve(setupXpath(driver))
      .elementByXPath("//UIATableCell[4]/UIAButton[1]")
      .getAttribute('name').should.become("X Button")
      .nodeify(done);
  });
  it('should filter by partial text', function (done) {
    driver
      .resolve(setupXpath(driver))
      .elementByXPath("//UIATableCell//UIAButton[contains(@name, 'X ')]").text()
        .should.become("X Button")
      .nodeify(done);
  });
});
