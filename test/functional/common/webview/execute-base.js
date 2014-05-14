"use strict";

var setup = require("../setup-base"),
    webviewHelper = require("../../../helpers/webview"),
    loadWebView = webviewHelper.loadWebView;

module.exports = function (desired) {

  describe("execute", function () {
    var driver;
    setup(this, desired, {'no-reset': true}).then(function (d) { driver = d; });

    beforeEach(function (done) {
      loadWebView(desired, driver).nodeify(done);
    });
    it("should bubble up javascript errors", function (done) {
      driver
        .execute("'nan'--")
          .should.be.rejectedWith(/status: (13|7)/)
        .nodeify(done);
    });
    it("should eval javascript", function (done) {
      driver
      .execute("return 1").should.become(1)
      .nodeify(done);
    });
    it("should not be returning hardcoded results", function (done) {
      driver
        .execute("return 1+1").should.become(2)
        .nodeify(done);
    });
    it("should return nothing when you don't explicitly return", function (done) {
      driver
        .execute("1+1")
          .should.not.eventually.exist
        .nodeify(done);
    });
    it("should execute code inside the web view", function (done) {
      driver
        .execute('return document.body.innerHTML.indexOf(' +
            '"I am some page content") > 0')
          .should.eventually.be.ok
        .execute('return document.body.innerHTML.indexOf(' +
            '"I am not some page content") > 0')
          .should.not.eventually.be.ok
        .nodeify(done);
    });
    it('should convert selenium element arg to webview element', function (done) {
      driver
        .elementById('useragent')
        .then(function (el) {
          return driver.execute(
            'return arguments[0].scrollIntoView(true);',
            [{'ELEMENT': el.value}]);
        }).nodeify(done);
    });
    it('should catch stale or undefined element as arg', function (done) {
      driver
        .elementById('useragent')
        .then(function (el) {
          return driver.execute(
            'return arguments[0].scrollIntoView(true);',
            [{'ELEMENT': (el.value + 1)}]
          ).should.beRejected;
        }).nodeify(done);
    });
    it('should be able to return multiple elements from javascript', function (done) {
      driver
        .execute('return document.getElementsByTagName("a");')
        .then(function (res) {
          res[0].value.should.exist;
        }).nodeify(done);
    });
  });
};
