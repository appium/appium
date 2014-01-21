"use strict";

var setup = require('./setup')
  , wd = require('wd')
  , Q = wd.Q
  , _ = require("underscore")
  , spinWait = require("../../helpers/spin.js").spinWait;

describe('find elements', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it('should find a single element by id', function(done) {
    // ButtonsExplain: 'Various uses of UIButton'
    browser
      .elementById('ButtonsExplain')
        .should.eventually.exist
      .nodeify(done);
  });

  it('should find a single element by name', function(done) {
    browser
      .execute("mobile: findElementNameContains", [{name: 'uses of UIButton'}])
        .getAttribute('name').should.become("Buttons, Various uses of UIButton")
      .nodeify(done);
  });

  it('should find an element within its parent', function(done) {
    browser
      .elementByTagName('tableView').then(function(el) {
        el.should.exist;
        return el.elementByTagName('text').text()
          .should.become("Buttons, Various uses of UIButton");
      }).nodeify(done);
  });

  it('should not find an element not within itself', function(done) {
    browser
      .elementByTagName('tableView').then(function(el) {
        el.should.exist;
        return el.elementByTagName('navigationBar')
          .should.be.rejectedWith(/status: 7/);
      }).nodeify(done);
  });

  it('should find some elements within itself', function(done) {
    browser
      .elementByTagName('tableCell').then(function(el) {
        el.should.exist;
        return  el.elementsByTagName('text')
          .should.eventually.have.length(1);
      }).nodeify(done);
  });

  it('should not find elements not within itself', function(done) {
    browser
      .elementByTagName('tableCell').then(function(el) {
        el.should.exist;
        el.elementsByTagName('navigationBar')
          .should.eventually.have.length(0);
      }).nodeify(done);
  });

  describe('findElementsByTagName', function() {
    it('should return all image elements with internally generated ids', function(done) {
      browser.elementsByTagName('image').then(function(els) {
        els.length.should.be.above(0);
        _(els).each(function(el) {
          el.should.exist;
        });
      }).nodeify(done);
    });
  });

  describe('findElement(s)ByXpath', function() {
    var setupXpath = function(driver) {
      return driver.elementByTagName('tableCell').click();
    };

    it('should return the last button', function(done) {
      browser
        .resolve(setupXpath(browser))
        .elementByXPath("//button[last()]").text()
          .should.become("Add contact")
        .nodeify(done);
      });
    it('should return a single element', function(done) {
      browser
        .resolve(setupXpath(browser))
        .elementByXPath("//button").text()
          .should.become("Back")
        .nodeify(done);
    });
    it('should return multiple elements', function(done) {
      browser
        .resolve(setupXpath(browser))
        .elementsByXPath("//button")
          .should.eventually.have.length.above(5)
        .nodeify(done);
    });
    it('should filter by name', function(done) {
      browser
        .resolve(setupXpath(browser))
        .elementByXPath("button[@name='Rounded']").text()
          .should.become("Rounded")
        .nodeify(done);
    });
    it('should know how to restrict root-level elements', function(done) {
      browser
        .resolve(setupXpath(browser))
        .elementByXPath("/button")
          .should.be.rejectedWith(/status: 7/)
        .nodeify(done);
    });
    it('should search an extended path by child', function(done) {
      browser
        .resolve(setupXpath(browser))
        .then(function() {
          return spinWait(function() {
            return browser.elementByXPath("navigationBar/text")
              .text().should.become('Buttons');
          });
        }).nodeify(done);
    });
    it('should search an extended path by descendant', function(done) {
      browser
        .resolve(setupXpath(browser))
        .elementsByXPath("cell//button").then(function(els) {
          return Q.all( _(els).map(function(el) { return el.text(); }) );
        }).then(function(texts) {
          texts.should.not.include("Button");
          texts.should.include("Gray");
        }).nodeify(done);
    });
    it('should filter by indices', function(done) {
      browser
        .resolve(setupXpath(browser))
        .then(function() {
          return spinWait(function() {
            return browser
              .elementByXPath("cell[2]//text[1]").text()
                .should.become("ButtonsViewController.m:\r(UIButton *)grayButton");
          });
        }).nodeify(done);
    });
    it('should filter by partial text', function(done) {
      browser
        .resolve(setupXpath(browser))
        .elementByXPath("cell//button[contains(@name, 'Gr')]").text()
          .should.become("Gray")
        .nodeify(done);
    });
  });
});
