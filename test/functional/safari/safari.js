/*global it:true */
"use strict";

var desc = require("../../helpers/driverblock.js").describeForSafari()
  , wvHelpers = require("../../helpers/webview.js")
  , webviewTests = wvHelpers.buildTests
  , loadWebView = wvHelpers.loadWebView
  , spinTitle = wvHelpers.spinTitle
  , _ = require('underscore')
  , should = require('should');


// todo: write window manipulation test for iphone version

desc('safari ipad', function(h) {
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

//var devices = ["iPhone", "iPad"];
var devices = ["iPad", "iPhone"];
_.each(devices, function(sim) {


  desc('safari init (' + sim + ')', function(h) {
    it('getting current window should work initially', function(done) {
      h.driver.windowHandle(function(err, handleId) {
        should.not.exist(err);
        handleId.should.eql(1);
        done();
      });
    });
  }, null, null, {device: sim + " Simulator"});

  desc('windows and frames (' + sim + ')', function(h) {
    it("should automate a new window if one opens", function(done) {
      loadWebView("safari", h.driver, function() {
        h.driver.elementById('blanklink', function(err, link) {
          link.click(function() {
            spinTitle("I am another page title", h.driver, function(err) {
              should.not.exist(err);
              done();
            });
          });
        });
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

    it("should be able to close windows", function(done) {
      loadWebView("safari", h.driver, function() {
        h.driver.elementById('blanklink', function(err, link) {
          link.click(function() {
            spinTitle("I am another page title", h.driver, function(err) {
              should.not.exist(err);
              h.driver.windowHandles(function(err, handles) {
                var handles1 = handles.length;
                h.driver.close(function(err) {
                  should.not.exist(err);
                  h.driver.windowHandles(function(err, handles) {
                    var handles2 = handles.length;
                    handles1.should.be.above(handles2);
                    spinTitle("I am a page title", h.driver, function(err) {
                      should.not.exist(err);
                      done();
                    });
                  });
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
