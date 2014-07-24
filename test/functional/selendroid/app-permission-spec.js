"use strict";

require('../../helpers/setup-chai');

var env = require('../../helpers/env')
  , initSession = require('../../helpers/session').initSession
  , _ = require('underscore')
  , desired = require('./desired');

describe('should not launch app without internet permission', function () {
  this.timeout(env.MOCHA_INIT_TIMEOUT);
  var session;
  var name = this.title;
  it('should not launch app', function (done) {
    var newDesired = _.defaults({'app': 'sample-code/apps/ContactManager/ContactManager.apk'}, desired);
    afterEach(function (done) {
      session
        .tearDown(this.currentTest.state === 'failed')
        .nodeify(done);
    });
    session = initSession(newDesired, {'no-retry': true, 'expect-error': true});
    session
      .setUp(name).catch(function (err) {
        err.data.should.include("INTERNET");
        throw err;
      }).should.be.rejectedWith(/The environment you requested was unavailable./)
      .nodeify(done);
  });
});
