"use strict";

var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base")
  , desired = require('./desired')
  , path = require('path')
  , _ = require('underscore');

describe('uicatalog - basic -', function () {

  describe('api', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    if (env.FAST_TESTS) {
      beforeEach(function (done) {
        driver
          .back()
          .nodeify(function () { done(); });
      });
    }

    it('should confirm element is not visible', function (done) {
      driver
        .elementByTagName('tableCell').click()
        .elementByName("UIButtonTypeContactAdd").isDisplayed()
          .should.not.eventually.be.ok
        .nodeify(done);
    });

    it('should confirm element is visible', function (done) {
      driver
        .elementByTagName('tableCell').click()
        .elementByName("UIButtonTypeRoundedRect").isDisplayed()
          .should.eventually.be.ok
        .nodeify(done);
    });

    it('should confirm element is selected  @skip-ios7', function (done) {
      driver
        .elementByXPath("//UIAStaticText[contains(@label, 'Pickers')]").click()
        .elementByXPath("//UIAButton[contains(@label, 'UIPicker')]").isSelected()
          .should.eventually.be.ok
        .nodeify(done);
    });

    it('should confirm element is not selected returns false', function (done) {
      driver
        .elementByXPath("//UIAStaticText[contains(@label, 'Pickers')]").click()
        .elementByXPath("//UIAButton[contains(@label, 'Custom')]").isSelected()
          .should.not.eventually.be.ok
        .nodeify(done);
    });

  });

  describe('load zipped app', function () {
    var driver;
    var appZip = path.resolve(__dirname, "../../../../assets/UICatalog6.0.app.zip");
    setup(this, {app: appZip})
      .then(function (d) { driver = d; });

    it('should load a zipped app via path', function (done) {
      driver.elementByTagName('tableView')
        .should.eventually.exist
      .nodeify(done);
    });
  });

  describe('load app with relative path', function () {
    var driver;
    var appPath = path.relative(process.cwd(), desired.app);
    setup(this, _.defaults({'app': appPath}, desired))
      .then(function (d) { driver = d; });

    it('should load with relative path', function (done) {
      driver.elementByTagName('tableView')
        .should.eventually.exist
      .nodeify(done);
    });
  });

  describe('load app with absolute path', function () {
    var driver;
    var appPath = path.resolve(process.cwd(), desired.app);
    setup(this, _.defaults({'app': appPath}, desired))
      .then(function (d) { driver = d; });

    it('should load with relative path', function (done) {
      driver.elementByTagName('tableView')
        .should.eventually.exist
      .nodeify(done);
    });
  });

  describe('load zipped app with relative path', function () {
    var driver;
    var appZip = "assets/UICatalog6.0.app.zip";
    setup(this, {app: appZip})
      .then(function (d) { driver = d; });

    it('should load a zipped app via path', function (done) {
      driver.elementByTagName('tableView')
        .should.eventually.exist
      .nodeify(done);
    });
  });

  describe('load zipped app via url', function () {
    var driver;
    var appUrl = 'http://appium.s3.amazonaws.com/UICatalog6.0.app.zip';
    setup(this, {app: appUrl})
      .then(function (d) { driver = d; });

    it('should load a zipped app via url', function (done) {
      driver
        .elementByTagName('tableView')
          .should.eventually.exist
        .nodeify(done);
    });
  });

  describe('appium ios', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should go back to using app from before', function (done) {
      driver
        .elementsByTagName('tableView')
          .should.eventually.have.length.above(0)
        .nodeify(done);
    });
  });
});
