// Run with mocha by installing dev deps: npm install --dev
// more docs on writing tests with mocha can be found here:
// http://visionmedia.github.com/mocha/
"use strict";

var chai = require('chai')
  , should = chai.should()
  , appium = require('../../lib/appium.js')
  , path = require('path')
  , IOS = require('../../lib/devices/ios/ios.js');

describe('IOS', function() {
  // we'd like to test ios.proxy; mock instruments
  var inst = new IOS({});
      inst.instruments = {};
      inst.instruments.sendCommand = function(cmd, cb) {
        // let's pretend we've got some latency here.
        var to = Math.round(Math.random()*10);
        setTimeout(function() { cb([cmd, to]); }, to);
      };

  describe('#proxy()', function() {
    return it('should execute one command at a time keeping the seq right', function(done) {
      var intercept = []
        , iterations = 100
        , check = function(err, result) {
          intercept.push(result);
          if (intercept.length >= iterations) {
            for (var x=0; x < iterations; x++) {
              intercept[x][0].should.equal(x);
            }
            done();
          }
        };

      for (var i=0; i < iterations; i++) {
        inst.proxy(i, check);
      }
    });
  });
});

describe('Appium', function() {
  var intercept = []
    , logPath = path.resolve(__dirname, "../../../appium.log")
    , inst = appium({log: logPath});

  inst.registerConfig({ios: true});

  describe('#start', function() {
    return it('should fail if a session is in progress', function(done) {
      var doneYet = function(num) {
        intercept.push(num);
        if (intercept.length > 9) {
          for (var i=0; i < intercept.length; i++) {
            intercept[i].should.not.equal(i);
          }
          done();
        }
      };

      var loop = function(num) {
        if (num > 9)
          return;

        inst.start({app: "/path/to/fake.app", device: "mock_ios"}, function(err) {
          var n = num;
          if (n > 0) {
            should.exist(err);
            doneYet(n);
          } else {
            setTimeout(function() {
              inst.stop(function() { doneYet(n); });
            }, 500);
          }
          loop(++num);
        });
      };

      loop(0);
    });
  });
});

describe('Appium with clobber', function() {
  var logPath = path.resolve(__dirname, "../../../appium.log")
    , inst = appium({log: logPath, sessionOverride: true });

  inst.registerConfig({mock_ios: true});

  describe('#start', function() {
    return it('should clobber existing sessions', function(done) {
      var numSessions = 9
        , dc = {app: "/path/to/fake.app", device: "mock_ios"};
      var loop = function(num) {
        if (num > numSessions) return;
        inst.start(dc, function() {
          var curSessId = inst.sessionId;
          var n = num;
          setTimeout(function() {
            var newSessId = inst.sessionId;
            if (n === numSessions) {
              curSessId.should.equal(newSessId);
              done();
            } else {
              curSessId.should.not.equal(newSessId);
            }
          }, Math.round(Math.random()*100));
          loop(++num);
        });
      };

      loop(0);
    });
  });
});
