/*global it:true */
"use strict";

var describeWd = require("../helpers/driverblock.js").describe
  , assert = require('assert');

describeWd('findElement', function(h) {
  return it('should find a single element on the app', function(done) {
    h.driver.elementByTagName('button', function(err, element) {
      assert.ok(element.value);
      done();
    });
  });
});

describeWd('findElements', function(h) {
  return it('findElements should find both elements on the app', function(done) {
    h.driver.elementsByTagName('button', function(err, elements) {
      assert.equal(elements.length, 2);
      assert.ok(elements[0].value);
      done();
    });
  });
});
