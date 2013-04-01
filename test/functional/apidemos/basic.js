/*global it:true */
"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = "ApiDemos"
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath,
      "android", appPkg, appAct)
  , should = require('should');

describeWd('basic', function(h) {
  it('should get device size', function(done) {
    h.driver.getWindowSize(function(err, size) {
      should.not.exist(err);
      size.width.should.be.above(0);
      size.height.should.be.above(0);
      done();
    });
  });
  it('should die with short command timeout', function(done) {
    var params = {timeout: 3};
    h.driver.execute("mobile: setCommandTimeout", [params], function(err) {
      should.not.exist(err);
      var next = function() {
        h.driver.elementByName('Animation', function(err) {
          should.exist(err);
          [13, 6].should.include(err.status);
          done();
        });
      };
      setTimeout(next, 4000);
    });
  });
});
