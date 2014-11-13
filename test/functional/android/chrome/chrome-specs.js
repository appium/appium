"use strict";
var desired = require('./desired')
  , _ = require('underscore')
  , webviewHelper = require("../../../helpers/webview")
  , loadWebView = webviewHelper.loadWebView
  , setup = require("../../common/setup-base");

describe("chrome @android-arm-only", function () {
  var tests = ['alerts', 'basics', 'cookies', 'execute-async', 'execute',
               'frames', 'iframes', 'implicit-wait', 'touch', 'window-title'];
  _.each(tests, function (test) {
    require('../../common/webview/' + test + '-base')(desired);
  });

  describe('contexts', function () {
    var driver;
    setup(this, desired, {'no-reset': true}).then(function (d) { driver = d; });

    before(function (done) {
      loadWebView(desired, driver).nodeify(done);
    });

    it('should be able to switch contexts', function (done) {
      driver
        .title().should.eventually.include("I am a page title")
        .contexts().then(function (ctxs) {
          ctxs.should.contain("NATIVE_APP");
          return driver.context("NATIVE_APP");
        })
        .source().should.eventually.include("android.widget.Button")
        .nodeify(done);
    });
  });

});
