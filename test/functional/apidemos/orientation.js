"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = ".ApiDemos"
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath,
      "android", appPkg, appAct)
  , it = require("../../helpers/driverblock.js").it;

describeWd('orientation', function(h) {
  if (process.env.FAST_TESTS) {
    afterEach(function(done) {
      h.driver.getOrientation().then(function(orientation) {
        if (orientation !== "PORTRAIT") {
          return h.driver.setOrientation("PORTRAIT");
        }
      }).nodeify(done);
    });
  }
  
  it('should rotate screen to landscape', function(done) {
    h.driver
      .setOrientation("LANDSCAPE")
      .sleep(3000)
      .getOrientation().should.become("LANDSCAPE")
      .nodeify(done);
  });
  it('should rotate screen to portrait', function(done) {
    h.driver
      .setOrientation("LANDSCAPE")
      .sleep(3000)
      .setOrientation("PORTRAIT")
      .getOrientation().should.become("PORTRAIT")
      .nodeify(done);
  });
  it('Should not error when trying to rotate to portrait again', function(done) {
    h.driver
      .setOrientation("PORTRAIT")
      .sleep(3000)
      .getOrientation().should.become("PORTRAIT")
      .nodeify(done);
  });
});
