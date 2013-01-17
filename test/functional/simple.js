// This is basically a port of webdriver-test.py
// https://github.com/hugs/appium/blob/master/sample-code/webdriver-test.py
/*global describe:true, it:true */
"use strict";

var wd = require('wd')
  , assert = require("assert")
  , caps = {
      browserName: 'iOS'
      , platform: 'Mac'
      , version: '6.0'
    };

describe('load calc app', function() {
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

  var driver = wd.remote('127.0.0.1', 4723);
  return it('should fill two fields with numbers', function(done) {
    driver.init(caps, function(err, sessionId) {
      populate(driver, function(elems) {
        driver.elementsByTagName('button', function(err, buttons) {
          buttons[0].click(function() {
            driver.elementsByTagName('staticText', function(err, elems) {
              elems[0].text(function(err, text) {
                var sum = values[0] + values[1];
                driver.quit(function() {
                  try {
                    assert.equal(parseInt(text, 10), sum);
                    done();
                  } catch (e) {
                    done(e);
                  }
                });
              });
            });
          });
        });
      });
    });
  });
});
