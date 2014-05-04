"use strict";
var env = require('../../helpers/env')
  , initSession = require('../../helpers/session').initSession
  , wd = require('wd')
  , chai = require('chai')
  , chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;
require("colors");

wd.addPromiseChainMethod('elementByRealXPath', function (selector) {
  return this.element('-real xpath', selector);
});

wd.addPromiseChainMethod('elementsByRealXPath', function (selector) {
  return this.elements('-real xpath', selector);
});

module.exports = function (context, desired, opts) {
  context.timeout(env.MOCHA_INIT_TIMEOUT);

  var session = initSession(desired, opts);

  if (env.FAST_TESTS) {
    before(function (done) { session.setUp().nodeify(done); });
    after(function (done) { session.tearDown().nodeify(done); });
  } else {
    beforeEach(function (done) { session.setUp().nodeify(done); });
    afterEach(function (done) { session.tearDown().nodeify(done); });
  }

  return session.promisedBrowser;
};
