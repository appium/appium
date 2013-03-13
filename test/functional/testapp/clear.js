/*global it:true */
"use strict";

var describeWd = require('../../helpers/driverblock.js').describeForApp('TestApp')
  , should = require("should")
  , assert = require('assert');

describeWd('clear', function(h) {
  return it('should clear the text field', function(done) {
    var someText = "some-value";
    h.driver.elementByTagName('textField', function(err, elem) {
      elem.sendKeys(someText, function() {
        elem.text(function(err, text) {
          assert.equal(text, someText);
          elem.clear(function(err) {
            elem.text(function(err, text) {
              assert.equal(text, '');
              done();
            });
          });
        });
      });
    });
  });
});

describeWd('keyboard', function(h) {
  it('should be hideable', function(done) {
    h.driver.elementByTagName('textField', function(err, elem) {
      should.not.exist(err);
      elem.sendKeys("1", function(err) {
        should.not.exist(err);
        h.driver.elementByTagName('slider', function(err, slider) {
          slider.click(function(err) {
            should.exist(err);
            h.driver.execute("mobile: hideKeyboard", [{keyName: "Done"}], function(err) {
              should.not.exist(err);
              h.driver.elementByTagName('slider', function(err, slider) {
                slider.click(function(err) {
                  should.not.exist(err);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });
});
