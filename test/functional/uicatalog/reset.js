/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , should = require('should');

describeWd('app reset', function(h) {
  it("should be able to find elements after a soft reset", function(done) {
    h.driver.elementsByTagName('tableView', function(err, els) {
      should.not.exist(err);
      els.length.should.equal(1);
      h.driver.execute("mobile: reset", function(err) {
        should.not.exist(err);
        h.driver.elementsByTagName('tableView', function(err, els) {
          should.not.exist(err);
          els.length.should.equal(1);
          done();
        });
      });
    });
  });
});
