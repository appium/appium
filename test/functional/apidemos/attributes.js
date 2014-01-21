"use strict";

var env = require('../../helpers/env')
  , setup = require("../common/setup-base")
  , desired = require("./desired");

describe('get attribute', function() {
  var browser;
  setup(this, desired)
   .then( function(_browser) { browser = _browser; } );
  if (env.FAST_TESTS) {
    afterEach(function(done) {
      // going back to main page if necessary todo: find better way
      browser.elementByNameOrNull('Accessibility').then(function(el) {
        if (!el) return browser.back();
      }).nodeify(done);
    });
  }
  
  it('should be able to find text attribute', function(done) {
    browser
      .elementByName('Animation').getAttribute('text')
        .should.become("Animation")
      .nodeify(done);
  });
  it('should be able to find name attribute', function(done) {
    browser.elementByName('Animation').getAttribute('name')
        .should.become("Animation")
      .nodeify(done);
  });
  it('should be able to find name attribute, falling back to text', function(done) {
    browser
      .elementByName('Animation').click()
      .elementsByTagName('text')
      .then(function(els) { return els[1].getAttribute('name'); })
        .should.become("Bouncing Balls")
      .back()
      .nodeify(done);
  });
  it('should be able to find displayed attribute', function(done) {
    browser
      .elementByName('Animation').getAttribute('displayed')
        .should.become('true')
      .nodeify(done);
  });
  it('should be able to find displayed attribute through normal func', function(done) {
    browser
      .elementByName('Animation').isDisplayed()
        .should.become(true)
      .nodeify(done);
  });
  it('should be able to get element location', function(done) {
    browser
      .elementByName('Animation').getLocation()
      .then(function(loc) {
        loc.x.should.be.at.least(0);
        loc.y.should.be.at.least(0);
      }).nodeify(done);
  });
  it('should be able to get element size', function(done) {
    browser
      .elementByName('Animation').getSize()
      .then(function(size) {
        size.width.should.be.at.least(0);
        size.height.should.be.at.least(0);
      }).nodeify(done);
  });
  // TODO: tests for checkable, checked, clickable, focusable, focused,
  // longClickable, scrollable, selected

  it('should be able to get selected value of a tab', function(done) {
    browser
      .execute("mobile: find", [["scroll",[[3, "views"]],[[7, "views"]]]]).click()
      .execute("mobile: find", [["scroll",[[3, "tabs"]],[[7, "tabs"]]]]).click()
      .execute("mobile: find", [["scroll",[[3, "content by id"]],[[7, "content by id"]]]]).click()
      .elementsByTagName("text").then(function(els) {
        els[0].getAttribute('selected').should.become('false'); // the 1st text is not selected
        els[1].getAttribute('selected').should.become('true'); // tab 1 is selected
      }).nodeify(done);
  });
});
