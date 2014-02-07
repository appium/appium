"use strict";

var setup = require("../common/setup-base")
  , desired = require('./desired')
  , Q = require("q")
  , _ = require("underscore")
  , spinWait = require("../../helpers/spin.js").spinWait;

describe('uicatalog - find element -', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should find a single element by id', function (done) {
    // ButtonsExplain: 'Various uses of UIButton'
    driver
      .elementById('ButtonsExplain')
        .should.eventually.exist
      .nodeify(done);
  });

  it('should find a single element by name', function (done) {
    driver
      .execute("mobile: findElementNameContains", [{name: 'uses of UIButton'}])
        .getAttribute('name').should.become("Buttons, Various uses of UIButton")
      .nodeify(done);
  });
  it('should find an element within its parent @skip-ios7', function (done) {
    driver
      .elementByTagName('tableView').then(function (el) {
        el.should.exist;
        return el.elementByTagName('text').text()
          .should.become("Buttons, Various uses of UIButton");
      }).nodeify(done);
  });

  it('should not find an element not within itself', function (done) {
    driver
      .elementByTagName('tableView').then(function (el) {
        el.should.exist;
        return el.elementByTagName('navigationBar')
          .should.be.rejectedWith(/status: 7/);
      }).nodeify(done);
  });

  it('should find some elements within itself', function (done) {
    driver
      .elementByTagName('tableCell').then(function (el) {
        el.should.exist;
        return el.elementsByTagName('text')
          .should.eventually.have.length(1);
      }).nodeify(done);
  });

  it('should not find elements not within itself', function (done) {
    driver
      .elementByTagName('tableCell').then(function (el) {
        el.should.exist;
        el.elementsByTagName('navigationBar')
          .should.eventually.have.length(0);
      }).nodeify(done);
  });

  describe('findElementsByTagName', function () {
    it('should return all image elements with internally generated ids', function (done) {
      driver.elementsByTagName('image').then(function (els) {
        els.length.should.be.above(0);
        _(els).each(function (el) {
          el.should.exist;
        });
      }).nodeify(done);
    });
  });

  describe('findElement(s)ByXpath', function () {
    var setupXpath = function (driver) {
      return driver.elementByTagName('tableCell').click();
    };

    it('should return the last button', function (done) {
      driver
        .resolve(setupXpath(driver))
        .elementByXPath("//button[last()]").text()
          .should.become("Add contact")
        .nodeify(done);
    });
    it('should return a single element', function (done) {
      driver
        .resolve(setupXpath(driver))
        .elementByXPath("//button").text()
          .should.become("Back")
        .nodeify(done);
    });
    it('should return multiple elements', function (done) {
      driver
        .resolve(setupXpath(driver))
        .elementsByXPath("//button")
          .should.eventually.have.length.above(5)
        .nodeify(done);
    });
    it('should filter by name', function (done) {
      driver
        .resolve(setupXpath(driver))
        .elementByXPath("button[@name='Rounded']").text()
          .should.become("Rounded")
        .nodeify(done);
    });
    it('should know how to restrict root-level elements', function (done) {
      driver
        .resolve(setupXpath(driver))
        .elementByXPath("/button")
          .should.be.rejectedWith(/status: 7/)
        .nodeify(done);
    });
    it('should search an extended path by child', function (done) {
      driver
        .resolve(setupXpath(driver))
        .then(function () {
          return spinWait(function () {
            return driver.elementByXPath("navigationBar/text")
              .text().should.become('Buttons');
          });
        }).nodeify(done);
    });
    it('should search an extended path by descendant', function (done) {
      driver
        .resolve(setupXpath(driver))
        .elementsByXPath("cell//button").then(function (els) {
          return Q.all(_(els).map(function (el) { return el.text(); }));
        }).then(function (texts) {
          texts.should.not.include("Button");
          texts.should.include("Gray");
        }).nodeify(done);
    });
    it('should filter by indices @skip-ios7', function (done) {
      driver
        .resolve(setupXpath(driver))
        .then(function () {
          return spinWait(function () {
            return driver
              .elementByXPath("cell[2]//text[1]").text()
                .should.become("ButtonsViewController.m:\r(UIButton *)grayButton");
          });
        }).nodeify(done);
    });
    it('should filter by partial text', function (done) {
      driver
        .resolve(setupXpath(driver))
        .elementByXPath("cell//button[contains(@name, 'Gr')]").text()
          .should.become("Gray")
        .nodeify(done);
    });
  });
});
