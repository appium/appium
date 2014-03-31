/*globals should:true */
"use strict";

var setup = require("../../common/setup-base"),
    _ = require('underscore'),
    initSession = require('../../../helpers/session').initSession,
    desired = require('./desired');

describe('testapp - device -', function () {

  describe('target actions', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it("should die in background and respond within (+/- 6 secs)", function (done) {
      var before;
      driver
        .sleep(5000)
        .then(function () { before = new Date().getTime() / 1000; })
        .execute("mobile: background", [{seconds: 1}])
        .catch(function (err) {
          err.cause.value.message.should.contain("Instruments died");
          throw err;
        }).should.be.rejectedWith(/status: 13/)
        .then(function () { ((new Date().getTime() / 1000) - before).should.be.below(10); })
        .sleep(5000) // cooldown
        .nodeify(done);
    });
  });

  describe('deviceName', function () {
    var newDesired = _.extend(_.clone(desired), {deviceName: "iFailure 3.5-inch"});
    var session = initSession(newDesired, {'no-retry': true});

    it('should fail gracefully with an invalid deviceName', function (done) {
      session.setUp()
        .should.be.rejectedWith(/environment you requested was unavailable/)
        .nodeify(done);
    });
  });

});
