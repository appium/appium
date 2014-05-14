"use strict";

var setup = require("../setup-base"),
    webviewHelper = require("../../../helpers/webview"),
    loadWebView = webviewHelper.loadWebView,
    testEndpoint = webviewHelper.testEndpoint;

module.exports = function (desired) {

  describe('iframes', function () {
    var driver;
    setup(this, desired, {'no-reset': true}).then(function (d) { driver = d; });

    beforeEach(function (done) {
      loadWebView(desired, driver, testEndpoint(desired) + 'iframes.html',
          "Iframe guinea pig").frame()
      .nodeify(done);
    });
    it('should switch to iframe by name', function (done) {
      driver
        .frame("iframe1")
        .title().should.become("Iframe guinea pig")
        .elementByTagName("h1").text().should.become("Sub frame 1")
        .nodeify(done);
    });
    it('should switch to iframe by index', function (done) {
      driver
        .frame(1)
        .title().should.become("Iframe guinea pig")
        .elementByTagName("h1").text().should.become("Sub frame 2")
        .nodeify(done);
    });
    it('should switch to iframe by id', function (done) {
      driver
        .frame("id-iframe3")
        .title().should.become("Iframe guinea pig")
        .elementByTagName("h1").text().should.become("Sub frame 3")
        .nodeify(done);
    });
    it('should switch to iframe by element', function (done) {
      driver
        .elementById('id-iframe3')
        .then(function (frame) {
          return driver
            .frame(frame)
            .title().should.become("Iframe guinea pig")
            .elementByTagName("h1").text().should.become("Sub frame 3");
        }).nodeify(done);
    });
    it('should not switch to iframe by element of wrong type', function (done) {
      driver
        .elementByTagName('h1')
        .then(function (h1) {
          return driver.frame(h1)
            .should.be.rejectedWith(/status: 8/);
        }).nodeify(done);
    });
    it('should switch back to default content from iframe', function (done) {
      driver
        .frame("iframe1")
        .title().should.become("Iframe guinea pig")
        .elementByTagName("h1").text().should.become("Sub frame 1")
        .frame(null)
        .elementsByTagName('iframe')
          .should.eventually.have.length(3)
        .nodeify(done);
    });
  });
};
