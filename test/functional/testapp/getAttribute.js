/*global it:true */
"use strict";

var describeWd = require('../../helpers/driverblock.js').describeForApp('TestApp')
  , assert = require('assert');

describeWd('getAttribute', function(h) {
  return it('should get element attribute', function(done) {
    h.driver.elementByTagName('button', function(err, elem) {
      elem.getAttribute("name", function(err, value){
        assert.equal(value, "ComputeSumButton");
        done();
      });
    });
  });
});
