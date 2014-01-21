"use strict";
var env = require('../../helpers/env')
  , setup = require("../common/setup-base")
  , loadWebView = require("../../helpers/webview-utils").loadWebView
  , spinTitle = require("../../helpers/webview-utils").spinTitle;

describe('windows and frames (' + env.DEVICE + ')', function() {
  var browser;
  setup(this, {app:'safari'})
    .then( function(_browser) { browser = _browser; } );

  it('getting current window should work initially', function(done) {
    browser
      .windowHandle().then(function(handleId) {
        parseInt(handleId, 10).should.be.above(0);
      }).nodeify(done);
  });
  describe('within webview', function() {
    beforeEach(function(done) {
      loadWebView("safari", browser).nodeify(done);
    });
    it("should throw nosuchwindow if there's not one", function(done) {
      browser
        .window('noexistman')
          .should.be.rejectedWith(/status: 23/)
        .nodeify(done);
    });
    it("should be able to open and close windows", function(done) {
      browser
        .elementById('blanklink').click()
        .then(function() { return spinTitle("I am another page title", browser); })
        .windowHandles()
        .then(function(handles) {
          return browser
            .sleep(2000).close().sleep(3000)
            .windowHandles()
              .should.eventually.be.below(handles.length);
      }).then(function() { return spinTitle("I am a page title", browser); })
      .nodeify(done);
    });
    it('should be able to go back and forward', function(done) {
      browser
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
});
