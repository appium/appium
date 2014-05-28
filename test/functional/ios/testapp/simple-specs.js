// This is basically a port of webdriver-test.py
// https://github.com/hugs/appium/blob/master/sample-code/webdriver-test.py
"use strict";

var setup = require("../../common/setup-base")
  , desired = require('./desired')
  , Q = require("q")
  , _ = require('underscore')
  , filterVisible = require('../../../helpers/ios-uiautomation').filterVisible;

describe('testapp - simple', function () {

  describe('using calc app', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    var values = [];
    var populate = function (driver) {
      return driver
        .elementsByIosUIAutomation(filterVisible('.textFields();'))
        .then(function (elems) {
        var sequence = _(elems).map(function (elem) {
          var val = Math.round(Math.random() * 10);
          values.push(val);
          return function () { return elem.sendKeys(val); };
        });
        return sequence.reduce(Q.when, new Q()); // running sequence
      });
    };

    it('should fill two fields with numbers', function (done) {
      populate(driver).then(function () {
        return driver
          .elementByClassName('UIAButton').click()
          .elementByClassName('UIAStaticText').text().then(function (text) {
            parseInt(text, 10).should.equal(values[0] + values[1]);
          });
      }).nodeify(done);
    });
  });
});
