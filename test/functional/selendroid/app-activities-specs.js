"use strict";

require('../../helpers/setup-chai');

var env = require('../../helpers/env')
  , initSession = require('../../helpers/session').initSession
  , _ = require('underscore')
  , desired = require('./desired');

describe('selendroid - app activities', function () {
  this.timeout(env.MOCHA_INIT_TIMEOUT);
  describe('with no dot', function () {
    var session;
    var name = this.parent.title + " " + this.title;
    it('should not launch app', function (done) {
      var newDesired = _.defaults({'appActivity': 'ApiDemos'}, desired);
      session = initSession(newDesired, {'no-retry': true});
      session
        .setUp(name)
        .should.be.rejected
        .nodeify(done);
    });
  });

  describe('fully qualified', function () {
    var session;
    var name = this.parent.title + " " + this.title;

    afterEach(function (done) {
      session
        .tearDown(this.currentTest.state === 'passed')
        .nodeify(done);
    });

    it('should still launch app', function (done) {
      var newDesired = _.defaults({'appActivity': 'com.example.android.apis.ApiDemos'}, desired);
      session = initSession(newDesired);
      session.setUp(name)
        .nodeify(done);
    });
  });
});
