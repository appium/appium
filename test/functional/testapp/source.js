/*global it:true */

"use strict";

var describeWd = require('../../helpers/driverblock.js').describeForApp('TestApp')
  , should = require('should');

describeWd('get source', function(h) {
  return it('should return the page source', function(done) {
    h.driver.source(function(err, source){
      var obj = JSON.parse(source);
      should.not.exist(err);
      should.ok(obj);
      obj.children[2].name.should.equal("ComputeSumButton");
      obj.children[3].rect.origin.x.should.equal(129);
      should.ok(obj.children[4].visible);
      done();
    });
  });
});
