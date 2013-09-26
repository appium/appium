"use strict";

var describeWd = require('../../helpers/driverblock.js').describeForApp('TestApp')
  , it = require("../../helpers/driverblock.js").it
  , should = require('should');

describeWd('get source', function(h) {
  return it('should return the page source', function(done) {
    h.driver.source(function(err, source){
      var obj = JSON.parse(source);
      should.not.exist(err);
      should.ok(obj);
      obj.type.should.equal("UIAApplication");
      obj.children[0].type.should.equal("UIAWindow");
      obj.children[0].children[2].name.should.equal("ComputeSumButton");
      obj.children[0].children[3].rect.origin.x.should.equal(129);
      should.ok(obj.children[0].children[4].visible);
      done();
    });
  });
});


