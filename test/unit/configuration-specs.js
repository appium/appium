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
      describe('platformName', function () {

        var deviceCapabilities = [
            [{}, {platformName: 'iOS'}, 'ios']
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
          , [{browserName: 'browser'}, {platformName: 'ios'}, 'ios']
          , [{browserName: 'Safari'}, {platformName: 'android'}, 'android']
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
          [{platformName: 'ios', safari: true}, {}, 'safari']
        , [{platformName: 'ios', safari: true}, {app: 'chrome'}, 'safari']
        , [{platformName: 'ios', safari: false}, {app: 'safari'}, 'safari']
        ];
        _.each(argsCases, function (test) {
          assertCapsGiveCorrectDevices(appium, test);
        });
      });

      describe('app arguments and capabilities', function () {
        var appCases = [
          [{}, {platformName: 'ios', app: 'safari'}, 'safari']
        , [{platformName: 'ios', app: 'Safari'}, {}, 'safari']
        , [{}, {platformName: 'ios', app: 'settings'}, 'ios']
        , [{}, {platformName: 'ios', app: 'lol'}, 'ios']
        , [{}, {platformName: 'android', app: 'chrome'}, 'chrome']
        , [{}, {platformName: 'android', app: 'chromium'}, 'chrome']
        , [{}, {platformName: 'android', app: 'chromebeta'}, 'chrome']
        , [{}, {platformName: 'android', app: 'browser'}, 'chrome']
        , [{platformName: 'android', app: 'Chrome'}, {}, 'chrome']
        , [{}, {platformName: 'android', app: 'lol'}, 'android']
        , [{platformName: 'ios', app: 'chrome'}, {}, 'ios']
        ];
        _.each(appCases, function (test) {
          assertCapsGiveCorrectDevices(appium, test);
        });
      });

      describe('package arguments and capabilities', function () {
        var packageCases = [
          [{}, {platformName: 'android', appPackage: 'com.android.chrome'}, 'chrome']
        , [{}, {platformName: 'android', appPackage: 'Com.Android.Chrome'}, 'chrome']
        , [{}, {platformName: 'android', appPackage: 'lol'}, 'android']
        , [{platformName: 'android', androidPackage: 'com.foo'}, {}, 'android']
        , [{platformName: 'android', androidPackage: 'com.android.browser'}, {}, 'chrome']
        , [{platformName: 'ios', androidPackage: 'com.android.browser'}, {}, 'ios']
        ];
        _.each(packageCases, function (test) {
          assertCapsGiveCorrectDevices(appium, test);
        });
      });
    });
  });
});
