/*global it:true */

/* EXAMPLE APPIUM + SAUCE LABS INTEGRATION
   First: npm install mocha -g; npm install wd
   Usage: SAUCE_USERNAME=xxx SAUCE_ACCESS_KEY=yyy mocha sauce.js */

"use strict";

var should = require("should")
  , appUrl = 'http://appium.s3.amazonaws.com/TestApp.app.zip'
  , dbPath = "../../../test/helpers/driverblock.js"
  , describeSauce = require(dbPath).describeForSauce(appUrl);

describeSauce('calc app', function(h) {
  var values = [];
  var populate = function(driver, cb) {
    driver.elementsByTagName('textField', function(err, elems) {
      should.not.exist(err);
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
    populate(driver, function() {
      driver.elementsByTagName('button', function(err, buttons) {
        buttons[0].click(function() {
          driver.elementsByTagName('staticText', function(err, elems) {
            elems[0].text(function(err, text) {
              var sum = values[0] + values[1];
              sum.should.equal(parseInt(text, 10));
              done();
            });
          });
        });
      });
    });
  });
}, undefined, undefined, {name: "Appium Test on Sauce"});
