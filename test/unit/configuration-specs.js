"use strict";

var getAppium = require('../../lib/appium')
  , _ = require('underscore');

var assertCapsGiveCorrectDevices = function (appium, args) {
  var spec = 'should turn ' + JSON.stringify(args[0]) + ' args and ' +
  JSON.stringify(args[1]) + ' caps into ' + args[2] + ' device';
  it(spec, function () {
    appium.getDeviceType(args[0], args[1]).should.equal(args[2]);
  });
};

describe('Appium', function () {
  describe('#getDeviceType', function () {
    // test is [args, caps, device]
    var appium = getAppium({});
    describe('mjsonwp spec capabilities', function () {
      describe('deviceName', function () {

        var deviceCapabilities = [
            [{}, {platformName: 'iOS'}, 'ios'],
          , [{}, {platformName: 'Android'}, 'android']
          , [{}, {platformName: 'FirefoxOS'}, 'firefoxos']
          , [{platformName: 'Android'}, {}, 'android']
          , [{platformName: 'ios'}, {}, 'ios']
          , [{platformName: 'iOS'}, {platformName: 'android'}, 'android']
          ];
        _.each(deviceCapabilities, function (test) {
          assertCapsGiveCorrectDevices(appium, test);
        });
      });

      describe('browserName', function () {

        var browserCapabilities = [
            [{}, {platformName: 'ios', browserName: 'Safari'}, 'safari']
          , [{}, {platformName: 'Android', browserName: 'Chrome'}, 'chrome']
          , [{}, {platformName: 'Android', browserName: 'ChromeBeta'}, 'chrome']
          , [{}, {platformName: 'Android', browserName: 'chromebeta'}, 'chrome']
          , [{}, {platformName: 'Android', browserName: 'browser'}, 'chrome']
          , [{browserName: 'browser'}, {platformName: 'Android'}, 'chrome']
          , [{browserName: 'Safari'}, {platformName: 'ios'}, 'safari']
          ];
        _.each(browserCapabilities, function (test) {
          assertCapsGiveCorrectDevices(appium, test);
        });
      });

      describe('automationName', function () {

        var automationCapabilities  = [
          [{}, {automationName: 'selendroid', platformName: 'Android'}, 'selendroid']
        , [{automationName: 'selendroid'}, {platformName: 'Android'}, 'selendroid']
        , [{automationName: 'selendroid'}, {automationName: 'appium', platformName: 'android'}, 'android']
        , [{automationName: 'appium'}, {platformName: 'Android'}, 'android']
        ];
        _.each(automationCapabilities, function (test) {
          assertCapsGiveCorrectDevices(appium, test);
        });
      });
    });

    describe('non compliant capabilitites using', function () {
      describe('argument cases', function () {
        var argsCases  = [
          [{ipa: '/path/to/my.ipa'}, {}, 'ios']
        , [{ipa: '/path/to/MY.IPA'}, {}, 'ios']
        , [{forceIphone: true}, {}, 'ios']
        , [{forceIpad: true}, {}, 'ios']
        , [{ipa: '/path/to/my.ipa', safari: true}, {}, 'ios']
        , [{safari: true}, {}, 'safari']
        , [{safari: true}, {app: '/path/to/my.apk'}, 'safari']
        , [{safari: false}, {app: 'safari'}, 'safari']
        , [{forceIpad: true}, {app: 'safari'}, 'safari']
        ];
        _.each(argsCases, function (test) {
          assertCapsGiveCorrectDevices(appium, test);
        });
      });

      describe('app capabilities', function () {
        var appCases = [
          [{}, {app: 'Safari'}, 'safari']
        , [{}, {app: 'settings'}, 'ios']
        , [{}, {app: 'Settings'}, 'ios']
        , [{}, {app: 'chrome'}, 'chrome']
        , [{}, {app: 'chromium'}, 'chrome']
        , [{}, {app: 'chromebeta'}, 'chrome']
        , [{}, {app: 'browser'}, 'chrome']
        , [{}, {app: 'http://www.site.com/my.app.zip'}, 'ios']
        , [{}, {app: 'http://www.site.com/MY.APP.ZIp'}, 'ios']
        , [{}, {app: 'http://www.site.com/my.apk.zip'}, 'android']
        , [{}, {app: 'http://www.site.com/my.apk'}, 'android']
        , [{}, {app: 'HTTP://WWW.Site.COM/MY.APk'}, 'android']
        , [{}, {app: '/path/to/my.app'}, 'ios']
        , [{}, {app: '/path/to/my.apk'}, 'android']
        , [{}, {app: '/path/to/my.apk'}, 'android']
        , [{}, {app: '/path/to/my.apk.app'}, 'ios']
        , [{}, {app: '/path/to/my.app.apk'}, 'android']
        ];
        _.each(appCases, function (test) {
          assertCapsGiveCorrectDevices(appium, test);
        });
      });
    });

    describe('package arguments and capabilities', function () {
      var packageCases = [
        [{}, {appPackage: 'com.android.chrome'}, 'chrome']
      , [{}, {appPackage: 'Com.Android.Chrome'}, 'chrome']
      , [{}, {appPackage: 'lol'}, 'android']
      , [{androidPackage: 'com.foo'}, {}, 'android']
      , [{androidPackage: 'com.android.browser'}, {}, 'chrome']
      ];
      _.each(packageCases, function (test) {
        assertCapsGiveCorrectDevices(appium, test);
      });
    });
  });
});
