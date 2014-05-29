"use strict";

var setup = require("../setup-base"),
    webviewHelper = require("../../../helpers/webview"),
    loadWebView = webviewHelper.loadWebView;

module.exports = function (desired) {

  describe('alerts', function () {
    var driver;
    setup(this, desired, {'no-reset': true}).then(function (d) { driver = d; });

    beforeEach(function (done) {
      loadWebView(desired, driver).nodeify(done);
    });
    it('should accept alert', function (done) {
      driver
        .elementById('alert1').click()
        .acceptAlert()
        .title().should.eventually.include("I am a page title")
        .nodeify(done);
    });
    it('should dismiss alert', function (done) {
      driver
        .elementById('alert1').click()
        .dismissAlert()
        .title().should.eventually.include("I am a page title")
        .nodeify(done);
    });
    it('should get text of alert', function (done) {
      driver
        .elementById('alert1').click()
        .alertText().should.eventually.include("I am an alert")
        .dismissAlert()
        .nodeify(done);
    });
    it('should not get text of alert that closed', function (done) {
      driver
        .elementById('alert1').click()
        .acceptAlert()
        .alertText()
          .should.be.rejectedWith(/status: 27/)
        .nodeify(done);
    });
    it('should set text of prompt', function (done) {
      driver
        .elementById('prompt1').click()
        .alertKeys("yes I do!")
        .acceptAlert()
        .elementById('promptVal').getValue().then(function (value) {
          // TODO: avoiding flaky test case where value is 'yes I dO'.
          value.toLowerCase().should.equal("yes i do!");
        })
        .nodeify(done);
    });
    it('should fail to set text of alert @skip-chrome', function (done) {
      driver
        .elementById('alert1').click()
        .alertKeys("yes I do!")
          .should.be.rejectedWith(/status: 11/)
        .nodeify(done);
    });
  });
};
