"use strict";

process.env.DEVICE = process.env.DEVICE || "selendroid";
var setup = require("../common/setup-base")
  , desired = require('./desired');


describe('selendroid - background app', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it("should background the app", function (done) {
    var before = new Date().getTime() / 1000;
    driver
      .backgroundApp(3)
      .then(function () {
        ((new Date().getTime() / 1000) - before).should.be.above(2);
        // this should not be tested
        // ((new Date().getTime() / 1000) - before).should.be.below(5);
      })
      .getCurrentActivity()
        .should.eventually.include("ApiDemos")
      .nodeify(done);
  });
});
