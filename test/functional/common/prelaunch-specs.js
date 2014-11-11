"use strict";
var env = require('../../helpers/env')
  , iosReset = require('../../helpers/reset').iosReset
  , path = require('path')
  , iosApp = path.resolve(__dirname, "..", "..", "..", "sample-code", "apps",
      "TestApp", "build", "Release-iphonesimulator", "TestApp.app")
  , androidApp = path.resolve(__dirname, "..", "..", "..", "sample-code",
      "apps", "ApiDemos", "bin", "ApiDemos-debug.apk")
  , spawn = require('child_process').spawn
  , crazyPort = 4799
  , _ = require('underscore')
  , chai = require('chai');

chai.should();

function log(data) {
  data = (data || "").replace(/(\r)?\n$/, '');
  if (env.VERBOSE) {
    console.log(data);
  } else {
    if (data.match(/error\:/)) console.log(data);
  }
}

var waitForLaunch = function (app, extraArgs, done) {
  var args = [".", "-p", crazyPort, "-l", "-dd", "-r", "5", "-lt", JSON.stringify(env.LAUNCH_TIMEOUT), "--platform-version", env.CAPS.platformVersion];
  if (app) {
    if (app === "safari") {
      args = args.concat(["--browser-name", "safari"]);
    } else {
      args = args.concat(["--app", app]);
    }
  }
  args = args.concat(extraArgs);
  log("Launching appium with args: " + JSON.stringify(args));
  var proc = spawn('node', args, {cwd: path.resolve(__dirname, "..", "..", "..")});
  proc.stdout.setEncoding('utf8');
  proc.stderr.setEncoding('utf8');
  var _done = done;
  done = _.once(function (err) {
    proc.kill();
    _done(err);
  });
  proc.stdout.on('data', function (data) {
    log(data);
    if (/Appium REST http interface listener started on/.test(data)) done();
  });
  proc.stderr.on('data', function (data) {
    log(data);
  });
  proc.on('exit', function () {
    done(new Error("Appium never started, set VERBOSE=1 to see output."));
  });
  return proc;
};

describe("common - prelaunch @skip-ci @skip-ios6", function () {
  // TODO: test helpers need to be modified to cope prelaunch on sauce.
  // leaving it out for now.
  this.timeout(env.MOCHA_INIT_TIMEOUT);
  describe('ios @skip-android-all', function () {
    var proc;

    beforeEach(function (done) {
      if (env.IOS && env.RESET_IOS) { return iosReset().nodeify(done); }
      else done();
    });

    afterEach(function (done) {
      try { proc.kill(); } catch (ign) {}
      setTimeout(function () {
        done();
      }, 3000);
    });

    it('should fail with a nice error message', function (done) {
      console.log('Expecting Appium to crash.');
      var data;
      proc = waitForLaunch(iosApp, [], function () {
        data.should.include('platformName');
        done();
      });
      proc.stderr.on('data', function (_data) {
        data += _data;
      });
    });

    it('should work for ios', function (done) {
      proc = waitForLaunch(iosApp, ['--platform-name', 'iOS'], done);
    });

    it('should work with force ipad', function (done) {
      proc = waitForLaunch(iosApp, ['--force-ipad', '--platform-name', 'iOS'], done);
    });

    it('should work with force iphone', function (done) {
      proc = waitForLaunch(iosApp, ['--force-iphone', '--platform-name', 'iOS'], done);
    });

    it('should work for safari via --safari', function (done) {
      proc = waitForLaunch(null, ['--safari', '--platform-name', 'iOS'], done);
    });

    it('should work for safari', function (done) {
      proc  = waitForLaunch('safari', ['--platform-name', 'iOS'], done);
    });

  });

  describe('android @skip-ios-all', function () {
    it('should work for android', function (done) {
      var args = ["--app-pkg", "io.appium.android.apis", "--app-activity",
        ".ApiDemos", '--platform-name', 'Android'];
      waitForLaunch(androidApp, args, done);
    });
  });

});
