/* global describe:true, before:true, after:true */
"use strict";

var path = require('path')
  , ADB = require("../../../lib/devices/android/adb.js")
  , spawn = require('child_process').spawn
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , badAppPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debugz.apk")
  , appPkg = "com.example.android.apis"
  , appAct = ".ApiDemos"
  , appAct2 = "ApiDemos"
  , appAct3 = "com.example.android.apis.ApiDemos"
  , appAct4 = ".Blargimarg"
  , driverBlock = require("../../helpers/driverblock.js")
  , describeWd = driverBlock.describeForApp(appPath, "android", appPkg, appAct)
  , describeWd2 = driverBlock.describeForApp(appPath, "android", appPkg, appAct2)
  , describeWd3 = driverBlock.describeForApp(appPath, "android", appPkg, appAct3)
  , describeWd4 = driverBlock.describeForApp(appPath, "android", appPkg, appAct4)
  , describeBad = driverBlock.describeForApp(badAppPath, "android", appPkg,
      appAct)
  , describeNoPkg = driverBlock.describeForApp(appPath, "android", null, appAct)
  , describeNoAct = driverBlock.describeForApp(appPath, "android", appPkg, null)
  , it = driverBlock.it
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
  it('should not die if commands come in', function(done) {
    var params = {timeout: 3};
    h.driver.execute("mobile: setCommandTimeout", [params], function(err) {
      should.not.exist(err);
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
  });
  it('should not fail even when bad locator strats sent in', function(done) {
    h.driver.elementByLinkText("foobar", function(err) {
      should.exist(err);
      err.status.should.equal(13);
      err.cause.value.origValue.should.eql("Sorry, we don't support the 'link text' locator strategy yet");
      h.driver.elementByName("Animation", function(err, el) {
        should.not.exist(err);
        should.exist(el);
        done();
      });
    });
  });
  it('should be able to get current activity', function(done) {
    h.driver.execute("mobile: currentActivity", function(err, activity) {
      should.not.exist(err);
      activity.should.include("ApiDemos");
      done();
    });
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
  it('should be able to detect if app is installed', function(done) {
    h.driver.execute('mobile: isAppInstalled', [{bundleId: 'foo'}], function(err, isInstalled) {
      should.not.exist(err);
      isInstalled.should.equal(false);
      h.driver.execute('mobile: isAppInstalled', [{bundleId: 'com.example.android.apis'}],
        function(err, isInstalled) {
          should.not.exist(err);
          isInstalled.should.equal(true);
          done();
      });
    });
  });
});

describeWd('without fastClear', function(h) {
  it('should still be able to reset', function(done) {
    h.driver.execute('mobile: reset', function(err) {
      should.not.exist(err);
      h.driver.getWindowSize(function(err) {
        should.not.exist(err);
        done();
      });
    });
  });
}, null, null, null, {fastClear: false});

describeWd2('activity style: no period', function(h) {
  it('should should still find activity', function(done) {
    done();
  });
}, null, null, null, {expectConnError: true});

describeWd3('activity style: fully qualified', function(h) {
  it('should still find activity', function(done) {
    done();
  });
});

describeWd4('activity style: non-existent', function(h) {
  it('should throw an error', function(done) {
    should.exist(h.connError);
    var err = JSON.parse(h.connError.data);
    err.value.origValue.should.include("Activity used to start app doesn't exist");
    done();
  });
}, null, null, null, {expectConnError: true});

describeBad('bad app path', function(h) {
  it('should throw an error', function(done) {
    should.exist(h.connError);
    var err = JSON.parse(h.connError.data);
    err.value.origValue.should.include("Error locating the app");
    done();
  });
}, null, null, null, {expectConnError: true});

describeNoAct('no activity sent in with caps', function(h) {
  it('should throw an error', function(done) {
    should.exist(h.connError);
    var err = JSON.parse(h.connError.data);
    err.value.origValue.should.include("app-activity");
    done();
  });
}, null, null, null, {expectConnError: true});

describeNoPkg('no package sent in with caps', function(h) {
  it('should throw an error', function(done) {
    should.exist(h.connError);
    var err = JSON.parse(h.connError.data);
    err.value.origValue.should.include("app-package");
    done();
  });
}, null, null, null, {expectConnError: true});

describe('pre-existing uiautomator session', function() {
  before(function(done) {
    var adb = new ADB();
    var binPath = path.resolve(__dirname, "..", "..", "..", "build",
        "android_bootstrap", "AppiumBootstrap.jar");
    var uiArgs = ["shell", "uiautomator", "runtest", "AppiumBootstrap.jar", "-c",
      "io.appium.android.bootstrap.Bootstrap"];
    adb.push(binPath, "/data/local/tmp/", function(err) {
      should.not.exist(err);
      spawn("adb", uiArgs);
      setTimeout(function() {
        adb.getPIDsByName("uiautomator", function(err, pids) {
          should.not.exist(err);
          pids.length.should.equal(1);
          done();
        });
      }, 500);
    });
  });
  describeWd('launching new session', function(h) {
    it('should kill pre-existing uiautomator process', function(done) {
      h.driver.getWindowSize(function(err) {
        should.not.exist(err);
        done();
      });
    });
  });
});
