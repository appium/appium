"use strict";

var describeWd = require('../../helpers/driverblock.js').describeForApp('TestApp')
  , it = require("../../helpers/driverblock.js").it
  , should = require('should');

describeWd('element size', function(h) {
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

describeWd('window size', function(h) {
  return it('should return the right width and height', function(done) {
    h.driver.getWindowSize(function(err, size) {
      should.not.exist(err);
      size.width.should.equal(320);
      size.height.should.equal(480);
      done();
    });
  });
});
