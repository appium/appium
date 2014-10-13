"use strict";

var setup = require("../../common/setup-base"),
    desired = require('./desired');

describe('uicatalog - reset @skip-ios7up', function () {

  describe('app reset', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it("should be able to find elements after a soft reset", function (done) {
      driver
        .elementsByClassName('UIATableView')
          .should.eventually.have.length(1)
        .resetApp()
        .sleep(3000)
        .elementsByClassName('UIATableView')
          .should.eventually.have.length(1)
        .nodeify(done);
    });
  });
});
