/*global describe:true, it:true */
"use strict";

var driverBlock = require("../helpers/driverblock.js")
  , assert = require('assert');

driverBlock(function(h) {
  describe('findElement', function() {
    return it('should find a single element on the app', function(done) {
      h.driver.elementByTagName('button', function(err, element) {
        assert.ok(element.value);
        done();
      });
    });
  });

  return describe('findElements', function() {
    return it('findElements should find both elements on the app', function(done) {
      h.driver.elementsByTagName('button', function(err, elements) {
        assert.equal(elements.length, 2);
        assert.ok(elements[0].value);
        done();
      });
    });
  });
});
