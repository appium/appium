"use strict";

require('../../helpers/setup-chai');

var env = require('../../helpers/env')
  , initSession = require('../../helpers/session').initSession
  , _ = require('underscore')
  , desired = require('./desired');

describe('app activities - with no dot @skip-ci', function () {
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
      })
      .nodeify(done);
  });
});
