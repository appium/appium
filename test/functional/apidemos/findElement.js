/*global it:true */
"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = "ApiDemos"
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath,
      "android", appPkg, appAct)
  , should = require('should');

describeWd('app', function(h) {
  it('should find a single element by tag name', function(done) {
    h.driver.elementByTagName("text", function(err, el) {
      should.not.exist(err);
      should.exist(el);
      el.text(function(err, text) {
        should.not.exist(err);
        text.should.eql("API Demos");
        done();
      });
    });
  });
});

