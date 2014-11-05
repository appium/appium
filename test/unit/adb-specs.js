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

    it('should match api 10 line', function (done) {
      testLine(
        "mFocusedApp=AppWindowToken{4073e120 token=HistoryRecord{4073db90 io.appium.android.apis/.ApiDemos}}",
        'io.appium.android.apis',
        '.ApiDemos'
        ).nodeify(done);
    });
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

  describe('startApp', function () {
    var getStartAppMock = function (apiLevel, stdout, startApp) {
      return {
        getApiLevel: function (cb) { cb(null, apiLevel); },
        shell: function (cmd, cb) { cb(null, stdout); },
        startApp: startApp
      };
    };

    it('should fail when there is no permission', function (done) {
      var stdout =
          'Stopping: com.android.contacts\n' +
          'Starting: Intent { cmp=com.android.contacts/.ContactsListActivity }\n' +
          'java.lang.SecurityException: Permission Denial: ' +
          'starting Intent { flg=0x10000000 cmp=com.android.contacts/.ContactsListActivity } ' +
          'from null (pid=13312, uid=2000) not exported from uid 10013\n' +
          '    at android.os.Parcel.readException(Parcel.java:1431)\n' +
          '    ...';

      ADB.prototype.startApp.call(getStartAppMock(19, stdout, null), {pkg: 'com.android.contacts'}, function (err) {
        err.should.not.be.null;
        err.message.should.include('Permission to start activity denied');
        done();
      });
    });

    it('should fail when no activity is specified', function (done) {
      var stdout =
          'Error: Activity class ... does not exist';

      ADB.prototype.startApp.call(getStartAppMock(19, stdout, null), {pkg: 'com.android.contacts'}, function (err) {
        err.should.not.be.null;
        err.message.should.include('Parameter \'appActivity\' is required for launching application');
        done();
      });
    });

    it('should fail when activity does not exist', function (done) {
      var stdout =
          'Error: Activity class ... does not exist';

      ADB.prototype.startApp.call(getStartAppMock(19, stdout, null), {
        pkg: 'com.android.contacts',
        activity: '.ContactsListActivity'
      }, function (err) {
        err.should.not.be.null;
        err.message.should.include('Activity used to start app doesn\'t exist or cannot be ' +
                                   'launched! Make sure it exists and is a launchable activity');
        done();
      });
    });

    it('should retry non-existent activity preceded by a `.`', function (done) {
      var stdout =
          'Error: Activity class ... does not exist';

      ADB.prototype.startApp.call(getStartAppMock(19, stdout, function (startAppOptions, cb) {
        startAppOptions.activity.should.equal('.ContactsListActivity');
        cb();
      }), {
        pkg: 'com.android.contacts',
        activity: 'ContactsListActivity'
      }, function () {
        done();
      });
    });
  });
});

