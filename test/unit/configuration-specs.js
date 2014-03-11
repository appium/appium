"use strict";

var getAppium = require('../../lib/appium')
  , chai = require('chai')
  , should = chai.should()
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
    describe('pre mjsonwp capabilities', function () {
      describe('device capabilities', function () {
        var happyTests = [
          [{}, {app: 'chromium', device: 'android'}, 'chrome']
        , [{}, {app: '/path/to/my.app', device: 'Android'}, 'android']
        , [{app: '/path/to/my.app'}, {device: 'Android'}, 'android']
        , [{}, {device: 'iPhone Simulator'}, 'ios']
        , [{}, {device: 'iPhone Simulator', browserName: 'Safari'}, 'ios']
        , [{}, {device: 'iPhone Simulator', browserName: 'safari'}, 'ios']
        , [{}, {device: 'iPhone'}, 'ios']
        , [{}, {device: 'iphone'}, 'ios']
        , [{}, {device: 'ipad'}, 'ios']
        , [{}, {device: 'iPad Simulator'}, 'ios']
        , [{}, {device: 'Selendroid'}, 'selendroid']
        , [{}, {device: 'Android'}, 'android']
        , [{}, {device: 'FirefoxOS'}, 'firefoxos']
        , [{}, {device: 'firefox'}, 'firefoxos']
        , [{}, {device: 'firefox', 'app-package': 'com.android.chrome'}, 'firefoxos']
        , [{}, {device: 'iphone', 'app-package': 'lol'}, 'ios']
        ];
        _.each(happyTests, function (test) {
          var spec = 'should turn ' + JSON.stringify(test[0]) + ' args and ' +
             JSON.stringify(test[1]) + ' caps into ' + test[2] + ' device';
          it(spec, function () {
            appium.getDeviceType(test[0], test[1]).should.equal(test[2]);
          });
        });
      });

      describe('negative cases', function () {

        var unhappyTests = [
          [{}, {}]
        , [{}, {device: 'rando'}]
        , [{}, {app: '/path/to/my.exe'}]
        , [{}, {browserName: 'Safari'}]
        , [{ipa: '/path/to/my.exe'}, {}]
        ];
        _.each(unhappyTests, function (test) {
          var spec = 'should fail with args ' + JSON.stringify(test[0]) + ' and ' +
                     'caps ' + JSON.stringify(test[1]);
          it(spec, function () {
            var err;
            try {
              appium.getDeviceType(test[0], test[1]);
            } catch (e) {
              err = e;
            }
            should.exist(err);
            err.message.should.contain("Could not determine your device");
          });
        });
      });
    });

    describe('mjsonwp spec capabilities', function () {
      describe('deviceName', function () {

        var deviceCapabilities = [
            [{}, {platformName: 'iOS'}, 'ios'],
          , [{}, {platformName: 'Android'}, 'android']
          , [{}, {platformName: 'FirefoxOS'}, 'firefoxos']
          ];
        _.each(deviceCapabilities, function (test) {
          assertCapsGiveCorrectDevices(appium, test);
        });
      });

      describe('browserName', function () {
        
        var browserCapabilities = [
            [{}, {platformName: 'ios', browserName: 'Safari'}, 'ios']
          , [{}, {platformName: 'Android', browserName: 'Chrome'}, 'chrome']
          , [{}, {platformName: 'Android', browserName: 'Chromium'}, 'chrome']
          , [{}, {platformName: 'Android', browserName: 'browser'}, 'chrome']
          ];
        _.each(browserCapabilities, function (test) {
          assertCapsGiveCorrectDevices(appium, test);
        });
      });

      describe('automationName', function () {

        var automationCapabilities  = [
          [{}, {automationName: 'selendroid', platformName: 'Android'}, 'selendroid']
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
        [{}, {'app-package': 'com.android.chrome'}, 'chrome']
      , [{}, {'app-package': 'Com.Android.Chrome'}, 'chrome']
      , [{}, {'app-package': 'lol'}, 'android']
      , [{androidPackage: 'com.foo'}, {}, 'android']
      , [{androidPackage: 'com.android.browser'}, {}, 'chrome']
      ];
      _.each(packageCases, function (test) {
        assertCapsGiveCorrectDevices(appium, test);
      });
    });
  });
});
