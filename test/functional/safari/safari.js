/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForSafari()
  , wvHelpers = require("../../helpers/webview.js")
  , webviewTests = wvHelpers.buildTests
  , loadWebView = wvHelpers.loadWebView
  , spinTitle = wvHelpers.spinTitle
  , _ = require('underscore')
  , should = require('should');

describeWd('safari init', function(h) {
  it('getting current window should work initially', function(done) {
    h.driver.windowHandle(function(err, handleId) {
      should.not.exist(err);
      handleId.should.eql(1);
      done();
    });
  });
});

// todo: write window manipulation test for iphone version

describeWd('safari ipad', function(h) {
  it('should be able to close tabs', function(done) {
    h.driver.frame(null, function() {
      h.driver.elementByTagName("window", function(err, win) {
        win.elementsByXPath("//button[contains(@name, 'Close tab for')]", function(err, els) {
          els.length.should.be.above(0);
          var closeTab = function(idx) {
            els[idx].click(function() {
              if (idx+1 === els.length) {
                done();
              } else {
                closeTab(idx+1);
              }
            });
          };
          closeTab(0);
        });
      });
    });
  });
}, null, null, {device: 'iPad Simulator'});

_.each(["iPhone", "iPad"], function(sim) {
  describeWd('windows and frames', function(h) {
    it("should automate a new window if one opens (" + sim + ")", function(done) {
      loadWebView("safari", h.driver, function() {
        h.driver.elementById('googlelink', function(err, link) {
          link.click(function() {
            spinTitle("Google", h.driver, function(err) {
              should.not.exist(err);
              done();
            });
          });
        });
      }, "http://localhost:4723/guinea-pig");
    });
  }, null, null, {device: sim + " Simulator"});
});

webviewTests('safari');
