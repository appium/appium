"use strict";

require('../../helpers/setup-chai');

var env = require('../../helpers/env')
  , initSession = require('../../helpers/session').initSession
  , _ = require('underscore')
  , desired = require('./desired')
  , path = require('path');

describe('should not launch app without internet permission', function () {
  this.timeout(env.MOCHA_INIT_TIMEOUT);
  var session;
  var name = this.title;
  it('should not launch ContactManager app', function (done) {
    var newDesired = _.defaults({'app': path.resolve(__dirname, '..', '..', '..', 'sample-code', 'apps', 'ContactManager', 'ContactManager.apk')}, desired);
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
      }).should.eventually.be.rejectedWith(/The environment you requested was unavailable./)
      .nodeify(done);
  });
});


describe('should launch app with internet permission', function () {
  this.timeout(env.MOCHA_INIT_TIMEOUT);
  var session = null
    , name = this.title;
  afterEach(function (done) {
    session
      .tearDown(this.currentTest.state === 'passed')
      .nodeify(done);
  });
  it('should launch ContactManager-selendroid app', function (done) {
    var newDesired = _.defaults({'app': path.resolve(__dirname, '..', '..', '..', 'sample-code', 'apps', 'ContactManager', 'ContactManager-selendroid.apk')}, desired);
    session = initSession(newDesired);
    session.setUp(name)
      .nodeify(done);
  });
});
