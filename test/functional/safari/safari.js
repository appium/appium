"use strict";

var desc = require("../../helpers/driverblock.js").describeForSafari()
  , it = require("../../helpers/driverblock.js").it
  , wvHelpers = require("../../helpers/webview.js")
  , webviewTests = wvHelpers.buildTests
  , loadWebView = wvHelpers.loadWebView
  , spinTitle = wvHelpers.spinTitle
  , _ = require('underscore');


var devices = ["iPad", "iPhone"];
_.each(devices, function(sim) {

  desc('windows and frames (' + sim + ')', function(h) {

    it('getting current window should work initially', function(done) {
      h.driver
        .windowHandle().then(function(handleId) {
          parseInt(handleId, 10).should.be.above(0);
        }).nodeify(done);
    });
    describe('within webview', function() {
      beforeEach(function(done) {
        loadWebView("safari",h.driver).nodeify(done);
      });
      it("should throw nosuchwindow if there's not one", function(done) {
        h.driver
          .window('noexistman')
            .should.be.rejectedWith(/status: 23/)
          .nodeify(done);
      });
      it("should be able to open and close windows", function(done) {
        h.driver
          .elementById('blanklink').click()
          .then(function() { return spinTitle("I am another page title", h.driver); })
          .windowHandles()
          .then(function(handles) {
            return h.driver
              .sleep(2000).close().sleep(3000)
              .windowHandles()
                .should.eventually.be.below(handles.length);
        }).then(function() { return spinTitle("I am a page title", h.driver); })
        .nodeify(done);
      });
      it('should be able to go back and forward', function(done) {
        h.driver
          .elementByLinkText('i am a link')
            .click()
          .elementById('only_on_page_2')
          .back()
          .elementById('i_am_a_textbox')
          .forward()
          .elementById('only_on_page_2')
          .nodeify(done);
      });
    });
  }, null, null, {device: sim + " Simulator"});
});

webviewTests('safari');
