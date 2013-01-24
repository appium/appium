/*global it:true*/
"use strict";

var should = require("should")
    , describeWd = require("../helpers/driverblock.js").describe;

describeWd('appium', function(h) {
  it('should fail gracefully after timeout', function(done) {
    var doSomething = function() {
      h.driver.elementsByTagName('textField', function(err) {
        should.exist(err);
        done();
      });
    };
    setTimeout(doSomething, 8000);
  });
}, undefined, undefined, undefined, {newCommandTimeout: 4});

return describeWd('appium', function(h) {
  it('should be available after previous timeout', function(done) {
    h.driver.elementsByTagName('textField', function(err) {
      should.not.exist(err);
      done();
    });
  });
}, undefined, undefined, undefined, {newCommandTimeout: 60});
