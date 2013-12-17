/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , path = require('path')
  , appUrl = 'http://appium.s3.amazonaws.com/UICatalog6.0.app.zip'
  , appZip = path.resolve(__dirname, "../../../assets/UICatalog6.0.app.zip")
  , describeZip = require('../../helpers/driverblock.js').describeForApp(appZip)
  , describeUrl = require('../../helpers/driverblock.js').describeForApp(appUrl)
  , should = require('should');

describeWd('basic', function(h) {

  it('should confirm element is not visible', function(done) {
    h.driver.elementsByTagName('tableCell', function(err, els) {
      els[0].click(function() {
        h.driver.elementByName("UIButtonTypeContactAdd", function(err, el) {
          should.not.exist(err);
          el.displayed(function(err, val) {
            should.not.exist(err);
            val.should.equal(false);
            done();
          });
        });
      });
    });
  });

  it('should confirm element is visible', function(done) {
    h.driver.elementsByTagName('tableCell', function(err, els) {
      els[0].click(function() {
        h.driver.elementByName("UIButtonTypeRoundedRect", function(err, el) {
          should.not.exist(err);
          el.displayed(function(err, val) {
            should.not.exist(err);
            val.should.equal(true);
            done();
          });
        });
      });
    });
  });

  it('should confirm element is selected', function(done) {
    h.driver.elementByXPath("text[contains(@text, 'Picker')]", function(err, el) {
      el.click(function() {
        h.driver.elementByXPath("button[contains(@text, 'UIPicker')]", function(err, el1) {
          should.not.exist(err);
          el1.selected(function(err, val) {
            should.not.exist(err);
            val.should.equal(true);
            done();
          });
        });
      });
    });
  });

  it('should confirm element is not selected returns false', function(done) {
    h.driver.elementByXPath("text[contains(@text, 'Picker')]", function(err, el) {
      el.click(function() {
        h.driver.elementByXPath("button[contains(@text, 'Custom')]", function(err, el1) {
          should.not.exist(err);
          el1.selected(function(err, val) {
            should.not.exist(err);
            val.should.equal(false);
            done();
          });
        });
      });
    });
  });

});

describeZip('appium ios', function(h) {
  it('should load a zipped app via path', function(done) {
    h.driver.elementByTagName('tableView', function(err, element) {
      should.not.exist(err);
      should.exist(element.value);
      done();
    });
  });
});

describeUrl('appium ios', function(h) {
  it('should load a zipped app via url', function(done) {
    h.driver.elementByTagName('tableView', function(err, element) {
      should.not.exist(err);
      should.exist(element.value);
      done();
    });
  });
});

describeWd('appium ios', function(h) {
  it('should go back to using app from before', function(done) {
    h.driver.elementsByTagName('tableView', function(err, elements) {
      should.not.exist(err);
      elements.length.should.be.above(0);
      done();
    });
  });
});
