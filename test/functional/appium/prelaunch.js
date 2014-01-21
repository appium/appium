"use strict";
var path = require('path')
  , iosApp = path.resolve(__dirname, "..", "..", "..", "sample-code", "apps",
      "TestApp", "build", "Release-iphonesimulator", "TestApp.app")
  , androidApp = path.resolve(__dirname, "..", "..", "..", "sample-code",
      "apps", "ApiDemos", "bin", "ApiDemos-debug.apk")
  , spawn = require('child_process').spawn
  , crazyPort = 4799;

var waitForLaunch = function(app, extraArgs, cb) {
  var args = [".", "-p", crazyPort, "-l", "-dd", "-m", "--app", app];
  args = args.concat(extraArgs);
  var proc = spawn('node', args, {cwd: path.resolve(__dirname, "..", "..", "..")});
  proc.stdout.setEncoding('utf8');
  proc.stderr.setEncoding('utf8');
  var calledBack = false;
  var output = '';
  var tm = setTimeout(function() {
    calledBack = true;
    proc.kill();
    cb(new Error("Appium never started. Output was: " + output));
  }, 30000);
  proc.stdout.on('data', function(data) {
    output += data;
    if (!calledBack &&/Appium REST http interface listener started on/.test(data)) {
      clearTimeout(tm);
      proc.kill();
      calledBack = true;
      cb();
    }
  });
  proc.stderr.on('data', function(data) {
    output += data;
  });
  proc.on('exit', function() {
    if (!calledBack) {
      calledBack = true;
      cb(new Error("Appium never started. Output was: " + output));
    }
  });
};

describe('Pre-launching apps', function() {
  it('should work for ios', function(done) {
    waitForLaunch(iosApp, [], done);
  });

  it('should work for android', function(done) {
    var args = ["--app-pkg", "com.example.android.apis", "--app-activity",
      ".ApiDemos"];
    waitForLaunch(androidApp, args, done);
  });
});
