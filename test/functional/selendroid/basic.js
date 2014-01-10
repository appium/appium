"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = ".ApiDemos"
  , appAct2 = "ApiDemos"
  , driverBlock = require("../../helpers/driverblock.js")
  , describeWd = driverBlock.describeForApp(appPath, "selendroid", appPkg, appAct)
  , describeWd2 = driverBlock.describeForApp(appPath, "selendroid", appPkg, appAct2)
  , it = driverBlock.it
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

  it('should be able to proxy errors', function(done) {
    h.driver.frame(null, function(err) {
      should.exist(err);
      done();
    });
  });

  it('should be able to set location', function(done) {
    var locOpts = {latitude: "27.17", longitude: "78.04"};
    h.driver.execute("mobile: setLocation", [locOpts], function(err) {
      should.not.exist(err);
      done();
    });
  });

  it('should error out nicely with incompatible commands', function(done) {
    h.driver.execute("mobile: flick", [{}], function(err) {
      should.exist(err);
      err.status.should.equal(9);
      err.cause.value.origValue.should.contain('mobile:');
      done();
    });
  });

  it('should be able to uninstall the app', function(done) {
    h.driver.execute("mobile: removeApp", [{bundleId: appPkg}], function(err) {
      should.not.exist(err);
      done();
    });
  });

});

describeWd('command timeouts', function(h) {
  it('should die with short timeout', function(done) {
    setTimeout(function() {
      h.driver.elementByName('Animation', function(err, el) {
        should.exist(err);
        should.not.exist(el);
        [13, 6].should.include(err.status);
        done();
      });
    }, 5000);
  });
  it('should not die if commands come in', function(done) {
    var start = Date.now();
    var find = function() {
      h.driver.elementByName('Animation', function(err, el) {
        should.not.exist(err);
        should.exist(el);
        if ((Date.now() - start) < 5000) {
          setTimeout(find, 500);
        } else {
          done();
        }
      });
    };
    find();
  });
}, null, null, {newCommandTimeout: 3});

describeWd2('app activities with no dot', function() {
  it('should still launch app', function(done) {
    done();
  });
});
