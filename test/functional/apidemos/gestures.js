/*global it:true */
"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = "ApiDemos"
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath,
      "android", appPkg, appAct)
  , should = require('should');

describeWd('gestures', function(h) {
  it('should click via x/y pixel coords', function(done) {
    h.driver.execute("mobile: tap", [{x: 100, y: 300}], function(err) {
      should.not.exist(err);
      var next = function() {
        h.driver.elementsByTagName("text", function(err, els) {
          should.not.exist(err);
          els[1].text(function(err, text) {
            should.not.exist(err);
            text.should.equal("Bouncing Balls");
            done();
          });
        });
      };
      setTimeout(next, 3000);
    });
  });
});
