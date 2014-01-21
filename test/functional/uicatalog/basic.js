"use strict";

var env = require('../../helpers/env')
  , setup = require("../common/setup-base")
  , desired = require('./desired')
  , path = require('path');

describe('uicatalog - basic -', function() {

  describe('api', function() {
    var driver;
    setup(this, desired).then( function(d) { driver = d; } );

    if (env.FAST_TESTS) {
      beforeEach(function(done) {
        driver
          .elementByNameOrNull('Back')
          .then(function(el) { if (el) return el.click(); })
          .nodeify(done);
      });
    }
    
    it('should confirm element is not visible', function(done) {
      driver
        .elementByTagName('tableCell').click()
        .elementByName("UIButtonTypeContactAdd").isDisplayed()
          .should.not.eventually.be.ok
        .nodeify(done);
    });

    it('should confirm element is visible', function(done) {
      driver
        .elementByTagName('tableCell').click()
        .elementByName("UIButtonTypeRoundedRect").isDisplayed()
          .should.eventually.be.ok
        .nodeify(done);
    });

    it('should confirm element is selected  @skip-ios7', function(done) {
      driver
        .elementByXPath("text[contains(@text, 'Picker')]").click()
        .elementByXPath("button[contains(@text, 'UIPicker')]").isSelected()
          .should.eventually.be.ok
        .nodeify(done);
    });

    it('should confirm element is not selected returns false', function(done) {
      driver
        .elementByXPath("text[contains(@text, 'Picker')]").click()
        .elementByXPath("button[contains(@text, 'Custom')]").isSelected()
          .should.not.eventually.be.ok
        .nodeify(done);
    });

  });

  describe('load zipped app', function() {
    var driver;
    var appZip = path.resolve(__dirname, "../../../assets/UICatalog6.0.app.zip");
    setup(this, {app: appZip})
      .then( function(d) { driver = d; } );

    it('should load a zipped app via path', function(done) {
      driver.elementByTagName('tableView')
        .should.eventually.exist
      .nodeify(done);
    });
  });

  describe('load zipped app via url', function() {
    var driver;
    var appUrl = 'http://appium.s3.amazonaws.com/UICatalog6.0.app.zip';
    setup(this, {app: appUrl})
      .then( function(d) { driver = d; } );

    it('should load a zipped app via url', function(done) {
      driver
        .elementByTagName('tableView')
          .should.eventually.exist
        .nodeify(done);
    });
  });

  describe('appium ios', function() {
    var driver;
    setup(this, desired).then( function(d) { driver = d; } );

    it('should go back to using app from before', function(done) {
      driver
        .elementsByTagName('tableView')
          .should.eventually.have.length.above(0)
        .nodeify(done);
    });
  });
});
