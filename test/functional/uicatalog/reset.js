"use strict";

var setup = require("../common/setup-base"),
    desired = require('./desired');

describe('uicatalog - reset -', function () {

  describe('app reset', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it("should be able to find elements after a soft reset", function (done) {
      driver
        .elementsByTagName('tableView')
          .should.eventually.have.length(1)
        .execute("mobile: reset")
        .sleep(3000)
        .elementsByTagName('tableView')
          .should.eventually.have.length(1)
        .nodeify(done);
    });
  });
});
