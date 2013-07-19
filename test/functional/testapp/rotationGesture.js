/*global it:true */
"use strict";

var assert = require("assert")
  , describeWd = require("../../helpers/driverblock.js").describeForApp('TestApp')
  , should = require("should");

describeWd('rotation gesture', function(h) {
  return it('should rotate map after tapping Test Gesture', function(done) {
    var driver = h.driver;
    driver.elementsByTagName('button', function(err, buttons) {
      buttons[3].click();
      should.not.exist(err);
    });
    driver.elementsByTagName('Map', function(err) {
      should.not.exist(err);
      driver.execute("mobile: rotate", [{x: 114, y: 198, duration: 5, radius: 3, rotation: 220, touchCount: 2}], function(err) {
        should.not.exist(err);
        done();
      });
    });
  });
});