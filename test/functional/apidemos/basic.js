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
  , appUrl = 'http://appium.s3.amazonaws.com/ApiDemos-debug.apk'
  , describeUrl = require('../../helpers/driverblock.js').describeForApp(appUrl, "android", appPkg, appAct)
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
  , chai = require('chai')
  , should = chai.should();

describeWd('basic', function(h) {
  it('should die with short command timeout', function(done) {
    var params = {timeout: 3};
    h.driver
      .execute("mobile: setCommandTimeout", [params])
      .sleep(4000)
      .elementByName('Animation')
        .should.be.rejectedWith(/status: (13|6)/)
      .nodeify(done);
  });
});

describeWd('basic', function(h) {
  it('should not die if commands come in', function(done) {
    var start;
    var find = function() {
      if ((Date.now() - start) < 5000) {
        return h.driver
          .elementByName('Animation').should.eventually.exist
          .then(find);
      }
    };
    var params = {timeout: 7};
    h.driver
      .execute("mobile: setCommandTimeout", [params])
      .then(function() { start = Date.now(); })
      .then(find)
      .sleep(10000)
      .elementByName('Animation').should.be.rejected
      .nodeify(done);
  });
});

describeWd('basic', function(h) {
  it('should get device size', function(done) {
    h.driver.getWindowSize()
      .then(function(size) {
        size.width.should.be.above(0);
        size.height.should.be.above(0);
      }).nodeify(done);
  });

  it('should be able to get current activity', function(done) {
    h.driver
      .execute("mobile: currentActivity")
        .should.eventually.include("ApiDemos")
      .nodeify(done);
  });
  it('should be able to get logcat log type', function(done) {
    h.driver
      .logTypes()
        .should.eventually.include('logcat')
      .nodeify(done);
  });
  it('should be able to get logcat logs', function(done) {
    h.driver.log('logcat').then(function(logs) {
      logs.length.should.be.above(0);
      logs[0].message.should.not.include("\n");
      logs[0].level.should.equal("ALL");
      logs[0].timestamp.should.exist;
    }).nodeify(done);
  });
  it('should be able to detect if app is installed', function(done) {
    h.driver
      .execute('mobile: isAppInstalled', [{bundleId: 'foo'}])
        .should.eventually.equal(false)
      .execute('mobile: isAppInstalled', [{bundleId: 'com.example.android.apis'}])
        .should.eventually.equal(true)
      .nodeify(done);
  });
  it("should background the app", function(done) {
    var before = new Date().getTime() / 1000;
    h.driver
      .execute("mobile: background", [{seconds: 3}])
      .then(function() {
        ((new Date().getTime() / 1000) - before).should.be.above(2);
        ((new Date().getTime() / 1000) - before).should.be.below(5);
      })
      .execute("mobile: currentActivity")
        .should.eventually.include("ApiDemos")
      .nodeify(done);
  });
});

// todo: not working in Nexus7
describeWd('without fastClear', function(h) {
  it('should still be able to reset', function(done) {
    h.driver
      .execute('mobile: reset')
      .getWindowSize()
      .nodeify(done);
  });
}, null, null, null, {fastClear: false});

describeWd2('activity style: no period', function() {
  it('should still find activity', function(done) {
    done();
  });
}, null, null, null, {expectConnError: true});

describeWd3('activity style: fully qualified', function() {
  it('should still find activity', function(done) {
    done();
  });
});

describeWd4('activity style: non-existent', function(h) {
  it('should throw an error', function(done) {
    h.connError.should.exist;
    var err = JSON.parse(h.connError.data);
    err.value.origValue.should.include("Activity used to start app doesn't exist");
    done();
  });
}, null, null, null, {expectConnError: true});

describeBad('bad app path', function(h) {
  it('should throw an error', function(done) {
    h.connError.should.exist;
    var err = JSON.parse(h.connError.data);
    err.value.origValue.should.include("Error locating the app");
    done();
  });
}, null, null, null, {expectConnError: true});

describeNoAct('no activity sent in with caps', function(h) {
  it('should throw an error', function(done) {
    h.connError.should.exist;
    var err = JSON.parse(h.connError.data);
    err.value.origValue.should.include("app-activity");
    done();
  });
}, null, null, null, {expectConnError: true});

describeNoPkg('no package sent in with caps', function(h) {
  it('should throw an error', function(done) {
    h.connError.should.exist;
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
      }, 2000);
    });
  });
  describeWd('launching new session', function(h) {
    it('should kill pre-existing uiautomator process', function(done) {
      h.driver.getWindowSize().should.eventually.exist
        .nodeify(done);
    });
  });
});

describeUrl('appium android', function(h) {
  it('should load a zipped app via url', function(done) {
    h.driver.execute("mobile: currentActivity")
      .should.eventually.include("ApiDemos")
      .nodeify(done);
  });
});
