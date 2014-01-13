"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = ".ApiDemos"
  , appAct2 = "ApiDemos"
  , driverBlock = require("../../helpers/driverblock.js")
  , Q = driverBlock.Q
  , describeWd = driverBlock.describeForApp(appPath, "selendroid", appPkg, appAct)
  , describeWd2 = driverBlock.describeForApp(appPath, "selendroid", appPkg, appAct2)
  , it = driverBlock.it;

// if it doesn't work run: adb uninstall com.example.android.apis

describeWd('basic', function(h) {
  it('should find and click an element', function(done) {
    // selendroid appears to have some issues with implicit waits
    // hence the timeouts
    h.driver
      .sleep(1000)
      .elementByName('App').click()
      .sleep(1000)
      .elementByLinkText("Action Bar").should.eventually.exist
      .nodeify(done);
  });

  it('should be able to get logcat log type', function(done) {
    h.driver.logTypes().should.eventually.include('logcat')
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

  it('should be able to proxy errors', function(done) {
    h.driver
      .frame(null).should.be.rejected
      .nodeify(done);
  });

  it('should be able to set location', function(done) {
    var locOpts = {latitude: "27.17", longitude: "78.04"};
    h.driver
      .execute("mobile: setLocation", [locOpts])
      .nodeify(done);
  });

  it('should error out nicely with incompatible commands', function(done) {
    h.driver
      .execute("mobile: flick", [{}])
      .catch(function(err) {
        err.cause.value.origValue.should.contain('mobile:'); throw err;
      }).should.be.rejectedWith(/status: 9/)
      .nodeify(done);
  });

  it('should be able to uninstall the app', function(done) {
    h.driver
      .execute("mobile: removeApp", [{bundleId: appPkg}])
      .nodeify(done);
  });

});

describeWd('command timeouts', function(h) {
  it('should die with short timeout', function(done) {
    h.driver
      .sleep(5000)
      .elementByName('Animation')
        .should.be.rejectedWith(/(status: (13|6))|(Not JSON response)/)
      .nodeify(done);
  });
}, null, null, {newCommandTimeout: 3});

describeWd('command timeouts', function(h) {
  it('should not die if commands come in', function(done) {
    var start = Date.now();
    var find = function() {
      if ((Date.now() - start) < 5000) {
        return h.driver
          .elementByName('Animation').should.eventually.exist
          .sleep(500)
          .then(find);
      } else return new Q();
    };
    find().then(function() {
      return h.driver
        .sleep(10000)
        .elementByName('Animation').should.be.rejected;
    }).nodeify(done);
  });
}, null, null, {newCommandTimeout: 7});

describeWd2('app activities with no dot', function() {
  it('should still launch app', function(done) {
    done();
  });
});
