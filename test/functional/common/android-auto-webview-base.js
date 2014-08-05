"use strict";

var env = require('../../helpers/env')
  , setup = require("../common/setup-base")
  , getAppPath = require('../../helpers/app').getAppPath;

var desired = {
  app: getAppPath('ApiDemos'),
  appActivity: '.view.WebView1',
  autoWebview: true
};
if (env.SELENDROID) {
  desired.automationName = 'selendroid';
}

module.exports = function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should go directly into webview', function (done) {
    driver
      .currentContext()
      .then(function (ctx) {
        ctx.indexOf('WEBVIEW').should.not.equal(-1);
      })
      .nodeify(done);
  });
};
