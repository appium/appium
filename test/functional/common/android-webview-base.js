"use strict";

var env = require('../../helpers/env')
  , setup = require("./setup-base")
  , safeClear = require('../../helpers/safe-clear')
  , getAppPath = require('../../helpers/app').getAppPath;

var desired = {
  app: getAppPath('ApiDemos'),
  appActivity: '.view.WebView1',
  newCommandTimeout: 90
};
if (env.SELENDROID) {
  desired.automationName = 'selendroid';
}

module.exports = function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  before(function (done) {
    driver
      .waitForElementByClassName('android.webkit.WebView')
      .contexts()
      .then(function (ctxs) {
        ctxs.should.have.length(2);
        return driver.context(ctxs[ctxs.length - 1]);
      })
      .nodeify(done);
  });

  it('should list all contexts', function (done) {
    driver
      .contexts().should.eventually.have.length.at.least(2)
      .nodeify(done);
  });

  // skip until Selendroid implements context methods
  it('should raise NoSuchContext (status: 35) @skip-selendroid-all', function (done) {
    driver
      .context('WEBVIEW_42')
      .should.be.rejectedWith(/status: 35/)
      .nodeify(done);
  });

  it('should find and click an element', function (done) {
    driver
      .elementById('i am a link').click()
      .source().should.eventually.include("I am some other page content")
      .back()
      .nodeify(done);
  });

  // TODO: clear does not work on selendroid
  it('should clear input @skip-selendroid-all', function (done) {
    var el;
    driver
      .waitForElementById('i_am_a_textbox', 10000, 500)
      .then(function (_el) { el = _el; })
      .then(function () { return el.getValue().should.not.become(""); })
      .then(function () { return safeClear(el); })
      .then(function () { return el.getValue().should.become(""); })
      .nodeify(done);
  });

  // TODO: clear does not work on selendroid
  it('should find and enter key sequence in input @skip-selendroid-all', function (done) {
    var el;
    driver
      .elementById('i_am_a_textbox')
      .then(function (_el) { el = _el; })
      .then(function () { return safeClear(el); })
      .then(function () { return el.type("Mathieu")
        .getValue().should.become("Mathieu"); })
      .nodeify(done);
  });

  it('should be able to handle selendroid special keys @skip-android-all', function (done) {
    driver.keys('\uE102').nodeify(done);
  });

  it('should get web source', function (done) {
    driver
      .waitForElementById('i_am_a_textbox') // making sure webview has been loaded
      .source().should.eventually.include("<h1>This page is a Selenium sandbox<")
      .nodeify(done);
  });

  it('should be able to move into and out of webview with proper proxying', function (done) {
    driver
      .elementById('i_am_a_textbox')
        .should.not.be.rejected
      // leave the webview
      .context('NATIVE_APP')
      // should not find the element in native context
      .elementById('i_am_a_textbox')
        .should.be.rejectedWith("status: 7")
      // go back into the webview
      .contexts()
      .then(function (ctxs) {
        return driver.context(ctxs[ctxs.length - 1]);
      })
      // should find the element in the web context
      .elementById('i_am_a_textbox')
        .should.not.be.rejected
      .nodeify(done);
  });

  it('should be able to get into a webview even after the webview ChromeDriver has is closed @skip-selendroid-all', function (done) {
    driver
      .context('WEBVIEW')
      .elementById('i_am_a_textbox')
        .should.not.be.rejected
      .context('NATIVE_APP')

      // restart activity anew, so old webview is gone
      .startActivity({
        appPackage: 'io.appium.android.apis',
        appActivity: '.view.WebView1'
      })
      .waitForElementByClassName('android.webkit.WebView')
      .contexts()
        .should.eventually.have.length(2)
      .context('WEBVIEW')
      .elementById('i_am_a_textbox')
        .should.not.be.rejected
      .nodeify(done);
  });
};
