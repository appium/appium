"use strict";

var describeWd = require('../../helpers/driverblock.js').describeForApp('TestApp')
  , it = require("../../helpers/driverblock.js").it;

describeWd('element size', function(h) {
  it('should return the right element size', function(done) {
    h.driver.elementByTagName('button').getSize().then(function(size) {
      size.width.should.eql(113);
      size.height.should.eql(37);
    }).nodeify(done);
  });

  it('should return the window size', function(done) {
    h.driver.getWindowSize().then(function(size) {
      size.width.should.be.above(319);
      size.height.should.be.above(479);
    }).nodeify(done);
  });
});
