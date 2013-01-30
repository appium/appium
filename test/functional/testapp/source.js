/*global it:true */

"use strict";

var describeWd = require('../../helpers/driverblock.js').describeForApp('TestApp')
  , should = require('should');

describeWd('get source', function(h) {
  return it('should return the page source', function(done) {
    h.driver.source(function(err, source){
      should.not.exist(err);
      should.ok(source);
      source.children[2].name.should.equal("ComputeSumButton");
      source.children[3].rect.origin.x.should.equal(129);
      should.ok(source.children[4].visible);
      done();
    });
  });
});
