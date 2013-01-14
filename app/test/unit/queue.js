// Run with mocha by installing dev deps: npm install --dev
// more docs on writing tests with mocha can be found here:
// http://visionmedia.github.com/mocha/

var assert = require('assert')
  , appium = require('../../appium');

describe('appium queues commands', function() {
  // we'd like to test appium.proxy; mock instruments
  var inst = appium(null, null, null);
      inst.instruments = {};
      inst.instruments.sendCommand = function(cmd, cb) {
        // let's pretend we've got some latency here.
        var to = Math.round(Math.random()*10);
        setTimeout(function() { cb([cmd, to]); }, to);
      };

  return it('should execute one at a time keeping the seq straight', function(done) {
    var intercept = [];
    var iterations = 100;

    for (var i=0; i < iterations; i++) {
      inst.proxy(i, function(result) {
        intercept.push(result);
        if (intercept.length >= iterations) {
          for (var x=0; x < iterations; x++) {
            assert.equal(intercept[x][0], x);
          }
          done();
        }
      });
    }
  });
});
