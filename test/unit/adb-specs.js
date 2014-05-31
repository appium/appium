"use strict";

var ADB = require('../../lib/devices/android/adb'),
  chai = require('chai'),
  should = chai.should(),
  Q = require('q');

describe('adb', function () {
  describe('getFocusedPackageAndActivity', function () {
    function testLine(line, expectedPackage, expectedActivity) {
      var deferred = Q.defer();
      try {
        var mock = { shell: function (cmd, cb) { cb(null, line); }};
        ADB.prototype.getFocusedPackageAndActivity.call(mock, function (err, thePackage, activity) {
          should.not.exist(err);
          thePackage.should.equal(expectedPackage);
          activity.should.equal(expectedActivity);
          deferred.resolve();
        });
      } catch (err) {
        deferred.reject(err);
      }
      return deferred.promise;
    }

    function testNullLine(line) {
      var deferred = Q.defer();
      try {
        var mock = { shell: function (cmd, cb) { cb(null, line); }};
        ADB.prototype.getFocusedPackageAndActivity.call(mock, function (err, thePackage, activity) {
          should.not.exist(err);
          should.not.exist(thePackage);
          should.not.exist(activity);
          deferred.resolve();
        });
      } catch (err) {
        deferred.reject(err);
      }
      return deferred.promise;
    }

    it('should match api 16 line', function (done) {
      testLine(
        "mFocusedApp=AppWindowToken{417ee228 token=Token{41602f78 ActivityRecord{41798a08 io.appium.android.apis/.ApiDemos}}}",
        'io.appium.android.apis',
        '.ApiDemos'
        ).nodeify(done);
    });
    it('should match api 18 line', function (done) {
      testLine(
        "mFocusedApp=AppWindowToken{41744660 token=Token{41ac7198 ActivityRecord{41af55c8 u0 io.appium.android.apis/.ApiDemos}}}",
        'io.appium.android.apis',
        '.ApiDemos'
        ).nodeify(done);
    });
    it('should match api 19 line', function (done) {
      testLine(
        "mFocusedApp=AppWindowToken{b40af858 token=Token{b3e2ce38 ActivityRecord{b3eb47d8 u0 io.appium.android.apis/.ApiDemos t6}}}",
        'io.appium.android.apis',
        '.ApiDemos'
        ).nodeify(done);
    });
    it('should match api 16 selendroid line', function (done) {
      testLine(
        "mFocusedApp=AppWindowToken{4157a2c8 token=Token{41582628 ActivityRecord{415821f0 com.android.launcher/com.android.launcher2.Launcher}}}",
        'com.android.launcher',
        'com.android.launcher2.Launcher'
        ).nodeify(done);
    });
    it('should find null lime', function (done) {
      testNullLine(
        "mFocusedApp=null"
        ).nodeify(done);
    });
  });
});

