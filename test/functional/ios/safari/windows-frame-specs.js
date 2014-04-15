"use strict";
var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base")
  , webviewHelper = require("../../../helpers/webview")
  , loadWebView = webviewHelper.loadWebView
  , spinTitle = webviewHelper.spinTitle;

describe("safari - windows-frame -", function () {

  describe('windows and frames (' + env.DEVICE + ')', function () {
    var driver;
    var desired = {
      browserName: 'safari',
      nativeWebTap: true
    };
    setup(this, desired).then(function (d) { driver = d; });

    it('getting current context should work initially', function (done) {
      driver
        .currentContext().should.eventually.be.fulfilled
        .nodeify(done);
    });
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
      it("should be able to open and close windows", function (done) {
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
});
