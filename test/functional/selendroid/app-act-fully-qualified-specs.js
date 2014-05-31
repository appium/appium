"use strict";

require('../../helpers/setup-chai');

var env = require('../../helpers/env')
  , initSession = require('../../helpers/session').initSession
  , _ = require('underscore')
  , desired = require('./desired');

describe('app activities - fully qualified', function () {
  this.timeout(env.MOCHA_INIT_TIMEOUT);
  var session;
  var name = this.title;

  afterEach(function (done) {
    session
      .tearDown(this.currentTest.state === 'passed')
      .nodeify(done);
  });

  it('should still launch app', function (done) {
    var newDesired = _.defaults({'appActivity': 'io.appium.android.apis.ApiDemos'}, desired);
    session = initSession(newDesired);
    session.setUp(name)
      .nodeify(done);
  });
});
