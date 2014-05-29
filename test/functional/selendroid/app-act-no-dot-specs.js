"use strict";

require('../../helpers/setup-chai');

var env = require('../../helpers/env')
  , initSession = require('../../helpers/session').initSession
  , _ = require('underscore')
  , desired = require('./desired')
  , attachToSession = require('../../helpers/session').attachToSession;

describe('app activities - with no dot', function () {
  this.timeout(env.MOCHA_INIT_TIMEOUT);
  var session;
  var name = this.title;
  it('should not launch app', function (done) {
    var newDesired = _.defaults({'appActivity': 'ApiDemos'}, desired);
    session = initSession(newDesired, {'no-retry': true, 'expect-error': true});
    session
      .setUp(name)
      .catch(function (err) {
        err.should.exist;
        if (env.SAUCE) {
          // getting session id from error and greening job
          var sessionId = null;
          try {
            var errorData = JSON.parse(err.data);
            sessionId = errorData.sessionId;
          } catch (ign) {}
          sessionId.should.exist;
          var driver = attachToSession(sessionId);
          return driver.sauceJobStatus(true);
        }
      })
      .nodeify(done);
  });
});
