"use strict";

var setup = require("../../../common/setup-base");

describe('uicatalog - load zipped app via url @skip-ios6', function () {
  var driver;
  var appUrl = 'http://appium.s3.amazonaws.com/WebViewApp7.1.app.zip';
  setup(this, {app: appUrl})
    .then(function (d) { driver = d; });

  it('should load a zipped app via url', function (done) {
    driver
      .elementByClassName('UIAWebView')
        .should.eventually.exist
      .nodeify(done);
  });
});
