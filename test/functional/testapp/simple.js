// This is basically a port of webdriver-test.py
// https://github.com/hugs/appium/blob/master/sample-code/webdriver-test.py
"use strict";

var assert = require("assert")
  , it = require("../../helpers/driverblock.js").it
  , describeWd = require("../../helpers/driverblock.js").describeForApp('TestApp');

describeWd('calc app', function(h) {
  var values = [];
  var populate = function(driver, cb) {
    driver.elementsByTagName('textField', function(err, elems) {
      var next = function(num) {
        if (num >= elems.length) {
          return cb(elems);
        }
        var val = Math.round(Math.random()*10);
        values.push(val);
        var elem = elems[num++];
        elem.sendKeys(val, function() {
          next(num);
        });
      };
      next(0);
    });
  };

  return it('should fill two fields with numbers', function(done) {
    var driver = h.driver;
    populate(driver, function(elems) {
      driver.elementsByTagName('button', function(err, buttons) {
        buttons[0].click(function() {
          driver.elementsByTagName('staticText', function(err, elems) {
            elems[0].text(function(err, text) {
              var sum = values[0] + values[1];
              assert.equal(parseInt(text, 10), sum);
              done();
            });
          });
        });
      });
    });
  });
});

