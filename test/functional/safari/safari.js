/*global it:true */
"use strict";

var desc = require("../../helpers/driverblock.js").describeForSafari()
  , wvHelpers = require("../../helpers/webview.js")
  , webviewTests = wvHelpers.buildTests
  , loadWebView = wvHelpers.loadWebView
  , spinTitle = wvHelpers.spinTitle
  , _ = require('underscore')
  , should = require('should');


//var devices = ["iPhone", "iPad"];
var devices = ["iPad", "iPhone"];
_.each(devices, function(sim) {

  desc('windows and frames (' + sim + ')', function(h) {

    it('getting current window should work initially', function(done) {
      h.driver.windowHandle(function(err, handleId) {
        should.not.exist(err);
        parseInt(handleId, 10).should.be.above(0);
        done();
      });
    });

    it("should throw nosuchwindow if there's not one", function(done) {
      loadWebView("safari", h.driver, function() {
        h.driver.window('noexistman', function(err) {
          should.exist(err);
          err.status.should.eql(23);
          done();
        });
      });
    });

    it("should be able to open and close windows", function(done) {
      loadWebView("safari", h.driver, function() {
        h.driver.elementById('blanklink', function(err, link) {
          link.click(function() {
            spinTitle("I am another page title", h.driver, function(err) {
              should.not.exist(err);
              h.driver.windowHandles(function(err, handles) {
                var handles1 = handles.length;
                h.driver.close(function(err) {
                  // wait for safari to write window status
                  setTimeout(function() {
                    should.not.exist(err);
                    h.driver.windowHandles(function(err, handles) {
                      var handles2 = handles.length;
                      handles1.should.be.above(handles2);
                      spinTitle("I am a page title", h.driver, function(err) {
                        should.not.exist(err);
                        done();
                      });
                    });
                  }, 3000);
                });
              });
            });
          });
        });
      });
    });
  }, null, null, {device: sim + " Simulator"});
});

webviewTests('safari');
