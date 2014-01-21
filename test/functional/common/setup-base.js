"use strict";
var env = require('../../helpers/env')
  , sessionUtils = require('../../helpers/session-utils')
  , wd = require('wd')
//  , domain = require('domain')
  , chai = require('chai')
  , chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;
require("colors");

module.exports = function(context, desired, opts) {
  context.timeout(env.MOCHA_TIMEOUT);

  var session = sessionUtils.initSession(desired, opts);

  if (env.FAST_TESTS) {
    before(function(done) { session.setUp().nodeify(done); });
    after(function(done) { session.tearDown().nodeify(done); });
  } else {
    beforeEach(function(done) { session.setUp().nodeify(done); });
    beforeEach(function(done) { session.tearDown().nodeify(done); });
  }

  return session.promisedBrowser;
};
