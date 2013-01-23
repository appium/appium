/*global it:true */
"use strict";

var describeWd = require('../helpers/driverblock.js').describe
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
