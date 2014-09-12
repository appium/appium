"use strict";
var env = require('../../helpers/env')
  , initSession = require('../../helpers/session').initSession
  , getTitle = require('../../helpers/title').getTitle
  , wd = require('wd')
  , _ = require('underscore')
  , chai = require('chai')
  , chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;
require("colors");

module.exports = function (context, desired, opts, envOverrides) {
  context.timeout(env.MOCHA_INIT_TIMEOUT);
  var newEnv = _.clone(env);
  if (envOverrides) {
    _.extend(newEnv, envOverrides);
  }

  var session = initSession(desired, opts);

  if (newEnv.FAST_TESTS) {
    var allPassed = true;
    before(function (done) {
      session
        .setUp(getTitle(context))
        .nodeify(done);
    });
    after(function (done) { session.tearDown(allPassed).nodeify(done); });
    afterEach(function () {
      allPassed = allPassed && this.currentTest.state === 'passed';
    });
  } else {
    beforeEach(function (done) {
      session
      .setUp(this.currentTest.parent.title + " " + this.currentTest.title)
      .nodeify(done);
    });
    afterEach(function (done) {
      session.tearDown(this.currentTest.state === 'passed').nodeify(done);
    });
  }

  return session.promisedBrowser;
};
