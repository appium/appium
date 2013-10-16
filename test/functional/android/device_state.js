/*global describe:true, it:true, beforeEach:true */
"use strict";

var deviceState = require('../../../android/device_state')
  , should = require('should')
  , childProcess = require('child_process')
  , it = require("../../helpers/driverblock.js").it
  , ADB = require('../../../android/adb');

describe('Android Device State module', function() {
  beforeEach(function(done) {
    // ensure a device or emu is connected
    childProcess.exec("adb devices", function(err, stdout) {
      should.not.exist(err);
      var device = /\n([A-Za-z0-9\-]+)\W+device\n/.exec(stdout);
      device = device[1];
      should.exist(device);
      done();
    });
  });

  describe('isScreenLocked method', function() {
    it('should return true if screen is locked', function(done) {
      // Press POWER btn to lock screen first
      childProcess.exec('adb shell input keyevent 26', function(err) {
        should.not.exist(err);

        childProcess.exec('adb shell input keyevent 26', function(err) {
          should.not.exist(err);
          deviceState.isScreenLocked('adb', function(err, isLocked) {
            should.not.exist(err);
            isLocked.should.equal(true);
            done();
          });
        });
      });
    });
    it('should return false is screen is unlocked', function(done) {
      // Push unlock.apk first
      var adb = new ADB();
      adb.pushUnlock(function(err) {
        should.not.exist(err);
        childProcess.exec('adb shell am start -n io.appium.unlock/.Unlock', function(err) {
          should.not.exist(err);
          setTimeout(function() {
            deviceState.isScreenLocked('adb', function(err, isLocked) {
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
