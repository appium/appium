/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , _s = require('underscore.string')
  , should = require('should');

describeWd('complex tap', function(h) {
  it('should work with custom options', function(done) {
    var tapOpts = {
      tapCount: 1 // how many taps
      , duration: 2.3 // how long
      , touchCount: 3 // how many fingers
      , x: 100 // in pixels from left
      , y: 250 // in pixels from top
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
  it('should work with default options', function(done) {
    h.driver.execute("mobile: tap", function(err) {
      should.not.exist(err);
      h.driver.elementByTagName("textview", function(err) {
        should.exist(err);
        err.status.should.equal(7);
        done();
      });
    });
  });
  it('should work on an element', function(done) {
    h.driver.elementsByTagName('tableCell', function(err, els) {
      should.not.exist(err);
      var el = els[4];
      var tapOpts = {
        x: 0.5 // in relative width from left
        , y: 0.5 // in relative height from top
        , elementId: el.value
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
});
