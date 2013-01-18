// Run with mocha by installing dev deps: npm install --dev
// more docs on writing tests with mocha can be found here:
// http://visionmedia.github.com/mocha/
/*global describe:true, it:true */
"use strict";

var assert = require('assert')
  , appium = require('../../appium')
  , ios = require('../../ios');

describe('IOS', function() {
  // we'd like to test ios.proxy; mock instruments
  var inst = ios(null, null, null);
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
        , check = function(result) {
          intercept.push(result);
          if (intercept.length >= iterations) {
            for (var x=0; x < iterations; x++) {
              assert.equal(intercept[x][0], x);
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
    , inst = appium({});

  var start = function(cb) {
        cb(null, {});
      }
    , stop = function(cb) {
        cb(null);
      }
    , mock = function(cb) {
        // mock
        inst.active = 'iOS';
        inst.devices[inst.active] = {};
        inst.devices[inst.active].start = start;
        inst.devices[inst.active].stop = stop;
        inst.device = inst.devices[inst.active];
        cb();
      };

  describe('#start', function() {
    return it('should queue up subsequent calls and execute them sequentially', function(done) {
      var doneYet = function(num) {
        intercept.push(num);
        if (intercept.length > 9) {
          for (var i=0; i < intercept.length; i++) {
            assert.equal(intercept[i], i);
          }
          done();
        }
      };

      var loop = function(num) {
        if (num > 9)
          return;

        mock(function() {
          inst.start(function(err, device) {
            var n = num;
            setTimeout(function() {
              inst.stop(function(sessionId) { doneYet(n); });
            }, Math.round(Math.random()*100));
            loop(++num);
          });
        });
      };

      loop(0);
    });
  });
});
