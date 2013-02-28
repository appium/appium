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
  it('should click', function(done) {
    h.driver.execute("mobile: tap", [{x: 100, y: 300}], function(err) {
      should.not.exist(err);
      done();
    });
  });
});
