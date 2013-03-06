/*global it:true */
"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = "ApiDemos"
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath,
      "android", appPkg, appAct)
  , should = require('should');

describeWd('get attribute', function(h) {
  it('should be able to find text attribute', function(done) {
    h.driver.elementByName('Animation', function(err, el) {
      should.not.exist(err);
      el.getAttribute('text', function(err, text) {
        should.not.exist(err);
        text.should.equal("Animation");
        done();
      });
    });
  });
});
