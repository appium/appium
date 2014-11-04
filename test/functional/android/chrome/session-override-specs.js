"use strict";
var desired = require('./desired'),
    env = require('../../../helpers/env'),
    initSession = require('../../../helpers/session').initSession,
    webviewHelper = require("../../../helpers/webview"),
    getTitle = require('../../../helpers/title').getTitle,
     loadWebView = webviewHelper.loadWebView,
    Q = require('q');
require('../../../helpers/setup-chai');

describe('basics', function () {
  this.timeout(env.MOCHA_INIT_TIMEOUT);
  var driver;
  var context = this;
  var session;
  // server needs to be run with --session-override, so skipping test by default
  // todo: configure it for ci using bdd-with-opts
  it.skip('should find a web element in the web view', function () {
    var test = function () {
      return Q.fcall(function () {
        session = initSession(desired);
        session.promisedBrowser.then(function (_driver) { driver = _driver; });
        return session.setUp(getTitle(context));
      }).then(function () { return loadWebView(desired, driver); })
      .then(function () {
        return driver
          .title().should.eventually.exist;
      });
    };
    return test()
      .delay(3000)
      .then(test)
      .delay(3000)
      .then(function () { return session.tearDown(true); });
  });
});

