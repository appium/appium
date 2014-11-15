"use strict";
var path = require('path')
  , setup = require("../common/setup-base");

require('../../helpers/setup-chai');

describe("appium mock api", function () {
  var mockApp = path.resolve(__dirname, 'app.xml');
  var driver;
  setup(this, {app: mockApp}).then(function (d) { driver = d; });

  describe('contexts', function () {
    it('should get current context', function (done) {
      driver
        .currentContext()
          .should.eventually.become('NATIVE_APP')
        .nodeify(done);
    });
    it('should get contexts', function (done) {
      driver
        .contexts()
           .should.eventually.become(['NATIVE_APP', 'WEBVIEW_1'])
        .nodeify(done);
    });
    it('should set context', function (done) {
      driver
        .context('WEBVIEW_1')
        .currentContext()
          .should.eventually.become('WEBVIEW_1')
        .nodeify(done);
    });
    it('should not set context that is not there', function (done) {
      driver
        .context('WEBVIEW_FOO')
          .should.eventually.be.rejectedWith(/35/)
        .nodeify(done);
    });
  });
});

