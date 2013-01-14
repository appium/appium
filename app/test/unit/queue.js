// Run with mocha by installing dev deps: npm install --dev
// more docs on writing tests with mocha can be found here:
// http://visionmedia.github.com/mocha/

var assert = require('assert')
  , appium = require('../../appium');

describe('Appium', function() {
  // we'd like to test appium.proxy; mock instruments
  var inst = appium(null, null, null);
      inst.instruments = {};
      inst.instruments.sendCommand = function(cmd, cb) {
        // let's pretend we've got some latency here.
        var to = Math.round(Math.random()*10);
        setTimeout(function() { cb([cmd, to]); }, to);
      };

  describe('#proxy()', function() {
    return it('should execute one command at a time keeping the seq sync', function(done) {
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
