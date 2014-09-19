// Run with mocha by installing dev deps: npm install --dev
// more docs on writing tests with mocha can be found here:
// http://visionmedia.github.com/mocha/
"use strict";

var chai = require('chai')
  , should = chai.should()
  , getAppium = require('../../lib/appium.js')
  , mock = require('../helpers/mock.js')
  , IOS = require('../../lib/devices/ios/ios.js')
  , path = require('path');

mock.noop(IOS.prototype, 'start');
mock.noop(IOS.prototype, 'stop');
mock.noop(IOS.prototype, 'configureApp');

describe('Appium', function () {
  var intercept = []
    , logPath = path.resolve(__dirname, "../../../appium.log")
    , appium = getAppium({log: logPath});

  appium.registerConfig({'ios': true});

  describe('#start', function () {
    return it('should fail if a session is in progress', function (done) {
      var doneYet = function (num) {
        intercept.push(num);
        if (intercept.length > 9) {
          for (var i = 0; i < intercept.length; i++) {
            intercept[i].should.not.equal(i);
          }
          done();
        }
      };

      var loop = function (num) {
        if (num > 9)
          return;
        appium.start({app: "/path/to/fake.app", deviceName: "iPhone", platformName: "iOS"}, function (err) {
          var n = num;
          if (n === 0) {
            should.not.exist(err);
          }
          if (n > 0) {
            should.exist(err);
            doneYet(n);
          } else {
            setTimeout(function () {
              appium.stop(function () { doneYet(n); });
            }, 500);
          }
          loop(++num);
        });
      };
      loop(0);
    });
  });
});

describe('Appium with clobber', function () {
  var logPath = path.resolve(__dirname, "../../../appium.log")
    , appium = getAppium({log: logPath, sessionOverride: true });

  appium.registerConfig({ios: true});

  describe('#start', function () {
    it('should clobber existing sessions', function (done) {
      var numSessions = 9
        , dc = {app: "/path/to/fake.app", deviceName: "iPhone", platformName: 'iOS'};
      var loop = function (num) {
        if (num > numSessions) return;
        appium.start(dc, function () {
          var curSessId = appium.sessionId;
          var n = num;
          setTimeout(function () {
            var newSessId = appium.sessionId;
            if (n === numSessions) {
              curSessId.should.equal(newSessId);
              done();
            } else {
              curSessId.should.not.equal(newSessId);
            }
          }, Math.round(Math.random() * 100));
          loop(++num);
        });
      };

      loop(0);
    });

    it('should retain sessionOverride arg across sessions', function (done) {
      var dc = {app: "/path/to/fake.app", deviceName: "iPhone", platformName: 'iOS'};
      appium.start(dc, function () {
        appium.sessionOverride.should.eql(true);
        appium.cleanupSession(null, function () {
          appium.start(dc, function () {
            appium.sessionOverride.should.eql(true);
            done();
          });
        });
      });
    });
  });
});
