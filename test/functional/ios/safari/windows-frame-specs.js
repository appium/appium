"use strict";
var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base")
  , webviewHelper = require("../../../helpers/webview")
  , loadWebView = webviewHelper.loadWebView
  , spinTitle = webviewHelper.spinTitle;

describe('safari - windows and frames (' + env.DEVICE + ') @skip-ios6"', function () {
  var driver;
  var desired = {
    browserName: 'safari',
    nativeWebTap: true
  };
  setup(this, desired).then(function (d) { driver = d; });

  describe('within webview', function () {
    beforeEach(function (done) {
      loadWebView("safari", driver).nodeify(done);
    });
    it("should throw nosuchwindow if there's not one", function (done) {
      driver
        .window('noexistman')
          .should.be.rejectedWith(/status: 23/)
        .nodeify(done);
    });
    it("should be able to open and close windows @skip-ios8", function (done) {
      // unfortunately, iOS8 doesn't respond to the close() method on window
      // the way iOS7 does
      driver
        .elementById('blanklink').click()
        .then(function () { return spinTitle("I am another page title", driver); })
        .windowHandles()
        .then(function (handles) {
          return driver
            .sleep(2000).close().sleep(3000)
            .windowHandles()
              .should.eventually.be.below(handles.length);
        }).then(function () { return spinTitle("I am a page title", driver); })
      .nodeify(done);
    });
    it('should be able to go back and forward', function (done) {
      driver
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
