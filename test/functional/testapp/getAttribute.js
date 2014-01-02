"use strict";

var describeWd = require('../../helpers/driverblock.js').describeForApp('TestApp')
  , it = require("../../helpers/driverblock.js").it;

describeWd('getAttribute', function(h) {
  it('should get element attribute', function(done) {
    h.driver
      .elementByTagName('button').getAttribute("name").should.become("ComputeSumButton")
      .nodeify(done);
  });
});
