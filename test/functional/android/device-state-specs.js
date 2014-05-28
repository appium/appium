"use strict";

var chai = require('chai')
  , should = chai.should()
  , childProcess = require('child_process')
  , Android = require('../../../lib/devices/android/android.js')
  , ADB = require('../../../lib/devices/android/adb');

// todo: hangs when doing 'adb shell input keyevent 3'
describe("android tests - device state - @skip-android-all", function () {

  describe('Android Device State module', function () {
    var deviceState = new ADB({});
    beforeEach(function (done) {
      // ensure a device or emu is connected
      childProcess.exec("adb devices", function (err, stdout) {
        should.not.exist(err);
        var device = /\n([A-Za-z0-9\-]+)\W+device\n/.exec(stdout);
        if (!device) {
          throw new Error("Looks like device isn't ready for test");
        }
        device = device[1];
        should.exist(device);
        done();
      });
    });

    describe('isScreenLocked method', function () {
      it('should return true if screen is locked', function (done) {
        // Press POWER btn to lock screen first
        childProcess.exec('adb shell input keyevent 26 && sleep 5', function (err) {
          should.not.exist(err);
          // press home to get to lock screen
          childProcess.exec('adb shell input keyevent 3 && sleep 5', function (err) {
            should.not.exist(err);
            deviceState.isScreenLocked(function (err, isLocked) {
              should.not.exist(err);
              isLocked.should.equal(true);
              done();
            });
          });
        });
      });
      it('should return false is screen is unlocked', function (done) {
        // Push unlock.apk first
        var androidObj = new Android({});
        androidObj.adb = deviceState;
        androidObj.pushUnlock(function (err) {
          should.not.exist(err);
          childProcess.exec('adb shell am start -n io.appium.unlock/.Unlock && sleep 5', function (err) {
            should.not.exist(err);
            setTimeout(function () {
              deviceState.isScreenLocked(function (err, isLocked) {
                should.not.exist(err);
                isLocked.should.equal(false);
                done();
              });
            }, 2500);
          });
        });
      });
    });
  });
});

