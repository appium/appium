/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , should = require('should');

describeWd('complex tap', function(h) {
  return it('should work', function(done) {
    h.driver.execute("mobile: tap", [1, 1, 0.1, 0.5, 0.5], function(err, res) {
      should.not.exist(err);
      setTimeout(done, 2000);
    });
  });
});
