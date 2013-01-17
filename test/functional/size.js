/*global it:true */
"use strict";

var describeWd = require('../helpers/driverblock.js').describe
  , should = require('should');

describeWd('check size', function(h) {
  return it('should return the right width and height', function(done) {
    h.driver.elementByTagName('button', function(err, element) {
      should.not.exist(err);
      should.exist(element.value);
      element.getSize(function(err, size) {
        should.not.exist(err);
        size.width.should.eql(113);
        size.height.should.eql(37);
        done();
      });
    });
  });
});
