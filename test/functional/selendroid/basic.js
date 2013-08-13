/*global it:true */
"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = ".ApiDemos"
  , driverBlock = require("../../helpers/driverblock.js")
  , describeWd = driverBlock.describeForApp(appPath, "selendroid", appPkg, appAct)
  , should = require('should');

describeWd('basic', function(h) {
  it('should find and click an element', function(done) {
    // selendroid appears to have some issues with implicit waits
    // hence the timeouts
    setTimeout(function() {
      h.driver.elementByName('App', function(err, el) {
        should.not.exist(err);
        should.exist(el);
        el.click(function(err) {
          should.not.exist(err);
          setTimeout(function() {
            h.driver.elementByLinkText("Action Bar", function(err, el) {
              should.not.exist(err);
              should.exist(el);
              done();
            });
          }, 1000);
        });
      });
    }, 1000);
  });

  it('should be able to get logcat log type', function(done) {
    h.driver.logTypes(function(err, logTypes) {
      should.not.exist(err);
      logTypes.should.include('logcat');
      done();
    });
  });
  it('should be able to get logcat logs', function(done) {
    h.driver.log('logcat', function(err, logs) {
      should.not.exist(err);
      logs.length.should.be.above(0);
      logs[0].message.should.not.include("\n");
      logs[0].level.should.equal("ALL");
      should.exist(logs[0].timestamp);
      done();
    });
  });
});

