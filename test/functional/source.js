/*global it:true */
"use strict";

var describeWd = require('../helpers/driverblock.js').describe
  , assert = require('assert');

describeWd('get source', function(h) {
  return it('should return the page source', function(done) {
    h.driver.source(function(err, source){
      assert.ok(~source.indexOf('<UIAButton>{"label":"ComputeSumButton","name":"ComputeSumButton"'));
      done();
    });
  });
});
