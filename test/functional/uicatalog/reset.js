"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , it = require("../../helpers/driverblock.js").it;

describeWd('app reset', function(h) {
  it("should be able to find elements after a soft reset", function(done) {
    h.driver
      .elementsByTagName('tableView')
        .should.eventually.have.length(1)
      .execute("mobile: reset")
      .elementsByTagName('tableView')
        .should.eventually.have.length(1)
      .nodeify(done);
  });
});
