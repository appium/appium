/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForSafari()
  , webviewTests = require("../../helpers/webview.js").buildTests
  , should = require('should');

describeWd('safari init', function(h) {
  it('getting current window should work initially', function(done) {
    h.driver.windowHandle(function(err, handleId) {
      should.not.exist(err);
      handleId.should.eql(1);
      done();
    });
  });
  it('should be able to clear windows', function(done) {
    h.driver.frame(null, function() {
      h.driver.elementByTagName("window", function(err, win) {
        win.elementsByXPath("//button[contains(@name, 'Close tab for')]", function(err, els) {
          if (els.length) {
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
          } else {
            done();
          }
        });
      });
    });
  });
});

webviewTests('safari');
