"use strict";

var _ = require('underscore'),
    initSession = require('../../../helpers/session').initSession,
    desired = require('./desired');

require('../../../helpers/setup-chai.js');

describe('testapp - device', function () {

  describe('invalid deviceName @skip-ios6', function () {
    var newDesired = _.extend(_.clone(desired), {deviceName: "iFailure 3.5-inch"});
    var session = initSession(newDesired, {'no-retry': true});

    it('should fail gracefully with an invalid deviceName', function (done) {
      session.setUp()
        .should.eventually.be.rejectedWith(/environment you requested was unavailable/)
        .nodeify(done);
    });
  });

  _.each(['iPhone', 'iPad'], function (device) {
    describe('generic ' + device + ' deviceName @skip-ios6', function () {
      var newDesired = _.extend(_.clone(desired), {
        deviceName: device + " Simulator"
      });
      var session = initSession(newDesired, {'no-retry': true});

      after(function (done) {
        session.tearDown(this.currentTest.state === 'passed').nodeify(done);
      });

      it('should work with a generic ' + device + ' deviceName', function (done) {
        session.setUp()
          .nodeify(done);
      });
    });

  });
});
