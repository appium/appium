"use strict";

var getAppium = require('../../lib/appium')
  , chai = require('chai')
  , should = chai.should()
  , _ = require('underscore')
  , IOS = require('../../lib/devices/ios/ios.js')
  , Safari = require('../../lib/devices/ios/safari.js')
  , Android = require('../../lib/devices/android/android.js')
  , Chrome = require('../../lib/devices/android/chrome.js')
  , Selendroid = require('../../lib/devices/android/selendroid.js');


describe('Appium', function () {
  describe('#getDeviceType', function () {
    // test is [args, caps, device]
    var appium = getAppium({});
    var happyTests = [
      [{ipa: '/path/to/my.ipa'}, {}, 'ios']
    , [{forceIphone: true}, {}, 'ios']
    , [{forceIpad: true}, {}, 'ios']
    , [{safari: true, forceIpad: true}, {}, 'safari']
    , [{ipa: '/path/to/my.ipa', safari: true}, {}, 'ios']
    , [{safari: true}, {}, 'safari']
    , [{safari: true}, {app: '/path/to/my.apk'}, 'safari']
    , [{safari: false}, {app: 'safari'}, 'safari']
    , [{}, {app: 'settings'}, 'ios']
    , [{}, {app: 'chrome'}, 'chrome']
    , [{}, {app: 'chromium'}, 'chrome']
    , [{}, {app: 'browser'}, 'chrome']
    , [{}, {app: 'http://www.site.com/my.app.zip'}, 'ios']
    , [{}, {app: 'http://www.site.com/my.apk.zip'}, 'android']
    , [{}, {app: 'http://www.site.com/my.apk'}, 'android']
    , [{}, {app: '/path/to/my.app'}, 'ios']
    , [{}, {app: '/path/to/my.apk'}, 'android']
    , [{}, {app: '/path/to/my.apk.app'}, 'ios']
    , [{}, {app: '/path/to/my.app.apk'}, 'android']
    , [{}, {app: '/path/to/my.app', device: 'Android'}, 'android']
    , [{app: '/path/to/my.app'}, {device: 'Android'}, 'android']
    , [{}, {device: 'iPhone Simulator'}, 'ios']
    , [{}, {device: 'iPhone'}, 'ios']
    , [{}, {device: 'ipad'}, 'ios']
    , [{}, {device: 'iPad Simulator'}, 'ios']
    , [{}, {device: 'Selendroid'}, 'selendroid']
    , [{}, {device: 'Android'}, 'android']
    , [{}, {device: 'FirefoxOS'}, 'firefoxos']
    , [{}, {device: 'firefox'}, 'firefoxos']
    , [{}, {device: 'firefox', 'app-package': 'com.android.chrome'}, 'firefoxos']
    , [{}, {'app-package': 'com.android.chrome'}, 'chrome']
    , [{}, {device: 'iphone', 'app-package': 'lol'}, 'ios']
    , [{}, {'app-package': 'lol'}, 'android']
    , [{androidPackage: 'com.foo'}, {}, 'android']
    , [{androidPackage: 'com.android.browser'}, {}, 'chrome']
    ];
    _.each(happyTests, function (test) {
      it('should turn ' + JSON.stringify(test[0]) + ' args and ' + JSON.stringify(test[1]) + ' caps into ' + test[2] + ' device', function () {
        appium.getDeviceType(test[0], test[1]).should.equal(test[2]);
      });
    });
  });
});

describe('IOS', function () {
});

