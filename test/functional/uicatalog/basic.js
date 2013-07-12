/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , _ = require("underscore")
  , spinWait = require("../../helpers/spin.js").spinWait
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
