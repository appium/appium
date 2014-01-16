"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , path = require('path')
  , appUrl = 'http://appium.s3.amazonaws.com/UICatalog6.0.app.zip'
  , appZip = path.resolve(__dirname, "../../../assets/UICatalog6.0.app.zip")
  , describeZip = require('../../helpers/driverblock.js').describeForApp(appZip)
  , describeUrl = require('../../helpers/driverblock.js').describeForApp(appUrl);

describeWd('basic', function(h) {

  if (process.env.FAST_TESTS) {
    beforeEach(function(done) {
      h.driver
        .elementByNameOrNull('Back')
        .then(function(el) { if (el) return el.click(); })
        .nodeify(done);
    });
  }
  
  it('should confirm element is not visible', function(done) {
    h.driver
      .elementByTagName('tableCell').click()
      .elementByName("UIButtonTypeContactAdd").isDisplayed()
        .should.not.eventually.be.ok
      .nodeify(done);
  });

  it('should confirm element is visible', function(done) {
    h.driver
      .elementByTagName('tableCell').click()
      .elementByName("UIButtonTypeRoundedRect").isDisplayed()
        .should.eventually.be.ok
      .nodeify(done);
  });

  it('should confirm element is selected', function(done) {
    h.driver
      .elementByXPath("text[contains(@text, 'Picker')]").click()
      .elementByXPath("button[contains(@text, 'UIPicker')]").isSelected()
        .should.eventually.be.ok
      .nodeify(done);
  });

  it('should confirm element is not selected returns false', function(done) {
    h.driver
      .elementByXPath("text[contains(@text, 'Picker')]").click()
      .elementByXPath("button[contains(@text, 'Custom')]").isSelected()
        .should.not.eventually.be.ok
      .nodeify(done);
  });

});

describeZip('appium ios', function(h) {
  it('should load a zipped app via path', function(done) {
    h.driver.elementByTagName('tableView')
      .should.eventually.exist
    .nodeify(done);
  });
});

describeUrl('appium ios', function(h) {
  it('should load a zipped app via url', function(done) {
    h.driver
      .elementByTagName('tableView')
        .should.eventually.exist
      .nodeify(done);
  });
});

describeWd('appium ios', function(h) {
  it('should go back to using app from before', function(done) {
    h.driver
      .elementsByTagName('tableView')
        .should.eventually.have.length.above(0)
      .nodeify(done);
  });
});
