/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , _s = require('underscore.string')
  , should = require('should');

describeWd('complex tap', function(h) {
  return it('should work', function(done) {
    var tapOpts = {
      tapCount: 1 // how many taps
      , duration: 0.1 // how long
      , touchCount: 1 // how many fingers
      , x: 0.5 // halfway across
      , y: 0.5 // halfway down
    };
    h.driver.execute("mobile: tap", [tapOpts], function(err) {
      should.not.exist(err);
      h.driver.elementByTagName("textview", function(err, el) {
        should.not.exist(err);
        el.text(function(err, text) {
          should.not.exist(err);
          _s.trim(text).should.eql("Now is the time for all good developers to come to serve their country.\n\nNow is the time for all good developers to come to serve their country.");
          done();
        });
      });
    });
  });
});
