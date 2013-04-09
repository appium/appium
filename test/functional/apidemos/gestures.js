/*global it:true */
"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = "ApiDemos"
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath,
      "android", appPkg, appAct)
  , should = require('should');

describeWd('gestures', function(h) {
  it('should click via x/y pixel coords', function(done) {
    h.driver.execute("mobile: tap", [{x: 100, y: 300}], function(err) {
      should.not.exist(err);
      var next = function() {
        h.driver.elementsByTagName("text", function(err, els) {
          should.not.exist(err);
          els[1].text(function(err, text) {
            should.not.exist(err);
            text.should.equal("Action Bar");
            done();
          });
        });
      };
      setTimeout(next, 3000);
    });
  });
  it('should click via x/y pct', function(done) {
    // this test depends on having a certain size screen, obviously
    // I use a nexus something or other phone style thingo
    h.driver.execute("mobile: tap", [{x: 0.6, y: 0.8}], function(err) {
      should.not.exist(err);
      var next = function() {
        h.driver.elementsByTagName("text", function(err, els) {
          should.not.exist(err);
          els[1].text(function(err, text) {
            should.not.exist(err);
            text.should.equal("Morse Code");
            done();
          });
        });
      };
      setTimeout(next, 3000);
    });
  });
  it('should swipe screen by pixels', function(done) {
    h.driver.elementByName("Views", function(err) {
      // shouldn't be visible
      should.exist(err);
      var swipeOpts = {
        startX: 100
        , startY: 500
        , endX: 100
        , endY: 100
        , duration: 1.2
      };
      h.driver.execute("mobile: swipe", [swipeOpts], function(err) {
        should.not.exist(err);
        h.driver.elementByName("Views", function(err, el) {
          should.not.exist(err);
          should.exist(el.value);
          done();
        });
      });
    });
  });
  it('should swipe screen by pct', function(done) {
    h.driver.elementByName("Views", function(err) {
      // shouldn't be visible
      should.exist(err);
      var swipeOpts = {
        endX: 0.5
        , endY: 0.05
        , duration: 0.7
      };
      h.driver.execute("mobile: swipe", [swipeOpts], function(err) {
        should.not.exist(err);
        h.driver.elementByName("Views", function(err, el) {
          should.not.exist(err);
          should.exist(el.value);
          done();
        });
      });
    });
  });
  it('should flick screen by pixels', function(done) {
    h.driver.elementByName("Views", function(err) {
      // shouldn't be visible
      should.exist(err);
      var swipeOpts = {
        startX: 100
        , startY: 500
        , endX: 100
        , endY: 100
      };
      h.driver.execute("mobile: flick", [swipeOpts], function(err) {
        should.not.exist(err);
        h.driver.elementByName("Views", function(err, el) {
          should.not.exist(err);
          should.exist(el.value);
          done();
        });
      });
    });
  });
  it('should flick screen by speed', function(done) {
    h.driver.elementByName("Views", function(err) {
      // shouldn't be visible
      should.exist(err);
      h.driver.flick(0, -100, function(err) {
        should.not.exist(err);
        h.driver.elementByName("Views", function(err, el) {
          should.not.exist(err);
          should.exist(el.value);
          done();
        });
      });
    });
  });
});
