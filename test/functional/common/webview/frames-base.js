"use strict";

var setup = require("../setup-base"),
    webviewHelper = require("../../../helpers/webview"),
    loadWebView = webviewHelper.loadWebView,
    testEndpoint = webviewHelper.testEndpoint;

module.exports = function (desired) {

  describe('frames', function () {
    var driver;
    setup(this, desired, {'no-reset': true}).then(function (d) { driver = d; });

    beforeEach(function (done) {
      loadWebView(desired, driver, testEndpoint(desired) + 'frameset.html',
          "Frameset guinea pig").frame()
      .nodeify(done);
    });
    it('should switch to frame by name', function (done) {
      driver
        .frame("first")
        .title().should.become("Frameset guinea pig")
        .elementByTagName("h1").text().should.become("Sub frame 1")
        .nodeify(done);
    });
    it('should switch to frame by index', function (done) {
      driver
        .frame(1)
        .title().should.become("Frameset guinea pig")
        .elementByTagName("h1").text().should.become("Sub frame 2")
        .nodeify(done);
    });
    it('should switch to frame by id', function (done) {
      driver
        .frame("frame3")
        .title().should.become("Frameset guinea pig")
        .elementByTagName("h1").text().should.become("Sub frame 3")
        .nodeify(done);
    });
    it('should switch back to default content from frame', function (done) {
      driver
        .frame("first")
        .title().should.become("Frameset guinea pig")
        .elementByTagName("h1").text().should.become("Sub frame 1")
        .frame(null)
        .elementByTagName('frameset').should.eventually.exist
        .nodeify(done);
    });
    it('should switch to child frames', function (done) {
      driver
        .frame("third")
        .title().should.become("Frameset guinea pig")
        .frame("childframe")
        .elementById("only_on_page_2").should.eventually.exist
        .nodeify(done);
    });
    it('should execute javascript in frame', function (done) {
      driver.frame("first")
        .execute("return document.getElementsByTagName('h1')[0].innerHTML;")
          .should.become("Sub frame 1")
        .nodeify(done);
    });
    it('should execute async javascript in frame', function (done) {
      driver.frame("first")
        .executeAsync("arguments[arguments.length - 1](" +
          "document.getElementsByTagName('h1')[0].innerHTML);")
        .should.become("Sub frame 1")
      .nodeify(done);
    });
  });
};
