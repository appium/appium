"use strict";

var env = require('../../helpers/env')
  , setup = require('./setup')
  , path = require('path');

describe('basic', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  if (env.FAST_TESTS) {
    beforeEach(function(done) {
      browser
        .elementByNameOrNull('Back')
        .then(function(el) { if (el) return el.click(); })
        .nodeify(done);
    });
  }
  
  it('should confirm element is not visible', function(done) {
    browser
      .elementByTagName('tableCell').click()
      .elementByName("UIButtonTypeContactAdd").isDisplayed()
        .should.not.eventually.be.ok
      .nodeify(done);
  });

  it('should confirm element is visible', function(done) {
    browser
      .elementByTagName('tableCell').click()
      .elementByName("UIButtonTypeRoundedRect").isDisplayed()
        .should.eventually.be.ok
      .nodeify(done);
  });

  it('should confirm element is selected', function(done) {
    browser
      .elementByXPath("text[contains(@text, 'Picker')]").click()
      .elementByXPath("button[contains(@text, 'UIPicker')]").isSelected()
        .should.eventually.be.ok
      .nodeify(done);
  });

  it('should confirm element is not selected returns false', function(done) {
    browser
      .elementByXPath("text[contains(@text, 'Picker')]").click()
      .elementByXPath("button[contains(@text, 'Custom')]").isSelected()
        .should.not.eventually.be.ok
      .nodeify(done);
  });

});

describe('appium ios', function() {
  var browser;
  var appZip = path.resolve(__dirname, "../../../assets/UICatalog6.0.app.zip");
  setup(this, {app: appZip})
    .then( function(_browser) { browser = _browser; } );

  it('should load a zipped app via path', function(done) {
    browser.elementByTagName('tableView')
      .should.eventually.exist
    .nodeify(done);
  });
});

describe('appium ios', function() {
  var browser;
  var appUrl = 'http://appium.s3.amazonaws.com/UICatalog6.0.app.zip';
  setup(this, {app: appUrl})
    .then( function(_browser) { browser = _browser; } );

  it('should load a zipped app via url', function(done) {
    browser
      .elementByTagName('tableView')
        .should.eventually.exist
      .nodeify(done);
  });
});

describe('appium ios', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it('should go back to using app from before', function(done) {
    browser
      .elementsByTagName('tableView')
        .should.eventually.have.length.above(0)
      .nodeify(done);
  });
});
