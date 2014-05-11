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

function getTitle(context) {
    var title = "";
    while(context) {
        if(context.title) {
            if(title) title = " - " + title;
            title = context.title + title;
        }
        context = context.parent;
    }
    return title;
}

module.exports = function (context, desired, opts) {
  context.timeout(env.MOCHA_INIT_TIMEOUT);

  var session = initSession(desired, opts);

  if (env.FAST_TESTS) {
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
