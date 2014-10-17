"use strict";

var setup = require("../../common/setup-base")
  , desired = require('././desired')
  , Q = require("q")
  , _ = require("underscore")
  , spinWait = require("../../../helpers/spin.js").spinWait;

describe('uicatalog - find by xpath @skip-ios6', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  describe('individual calls', function () {
    var setupXpath = function (driver) {
      return driver.elementByXPath("//UIAStaticText[contains(@label,'Buttons')]")
        .click();
    };

    afterEach(function (done) {
      driver
        .elementByName('UICatalog').click()
        .sleep(1000)
        .nodeify(done);
    });

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

    describe('duplicate text field', function () {

      it('should find only one text field', function (done) {
        driver
          .waitForElementByName('*Text Fields*', 3000, 500).click()
          .sleep(2000)
          .elementsByXPath('//UIATableView["Empty list"]/UIATableCell[1]/UIATextField')
            .should.eventually.have.length(1)
          .nodeify(done);
      });

      it('should find only one text field when doing relative search', function (done) {
        driver
          .waitForElementByName('*Text Fields*', 3000, 500).click()
          .sleep(2000)
          .elementsByXPath('//UIATableView["Empty list"]')
          .elementsByXPath('>', '//UIATableCell[1]/UIATextField')
            .should.eventually.have.length(1)
          .nodeify(done);
      });

      it('should find only one secure text field', function (done) {
        driver
          .waitForElementByName('*Text Fields*', 3000, 500).click()
          .sleep(2000)
          .elementsByXPath('//UIATableView["Empty list"]/UIATableCell[3]/UIASecureTextField')
            .should.eventually.have.length(1)
          .nodeify(done);
      });

    });
  });

  describe('multiple calls', function () {
    var runs = 5;

    var test = function (path, minLength) {
      return function () {
        it('should not crash', function (done) {
          driver
            .elementsByXPath(path)
              .should.eventually.have.length.above(minLength)
            .nodeify(done);
        });
      };
    };

    describe('finding specific path', function () {
      for (var n = 0; n < runs; n++) {
        describe('test ' + (n + 1), test("//UIAApplication[1]/UIAWindow/UIATableView/UIATableCell", 17));
      }
    });

    describe('finding //*', function () {
      for (var n = 0; n < runs; n++) {
        describe('test ' + (n + 1), test("//*", 52));
      }
    });
  });
});
