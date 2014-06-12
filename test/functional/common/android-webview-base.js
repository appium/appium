/*global beforeEach:true */
"use strict";

var env = require('../../helpers/env')
  , setup = require("./setup-base")
  , safeClear = require('../../helpers/safe-clear');

var desired = {
  app: "sample-code/apps/selendroid-test-app.apk",
  appPackage: 'io.selendroid.testapp',
  appActivity: '.HomeScreenActivity'
};

module.exports = function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  beforeEach(function (done) {
    driver
      .sleep(3000)
      .setImplicitWaitTimeout(0)
      .waitForElementByName('buttonStartWebviewCD')
      .then(function (el) {
        if (el) return;
        else return driver.back();
      })
      .setImplicitWaitTimeout(env.IMPLICIT_WAIT_TIMEOUT)
      .elementByName('buttonStartWebviewCD').click()
      .then(function () {
        if (env.SELENDROID) return driver.waitForElementById('mainWebView');
        else return driver.waitForElementByXPath(
          "//android.widget.TextView[@text='Web View Interaction']");
      })
      .contexts()
      .then(function (ctxs) {
        return driver.context(ctxs[ctxs.length - 1]);
      })
      .nodeify(done);
  });

  if (env.FAST_TESTS) {
    afterEach(function (done) {
      driver
        .context('NATIVE_APP')
        .then(function () {
          if (env.DEVICE === "selendroid") {
            return driver.elementByIdOrNull('goBack');
          } else {
            return driver.elementByClassNameOrNull('android.widget.Button');
          }
        })
        .then(function (el) {
          if (el) return el.click().sleep(1000);
        }).nodeify(done);
    });
  }

  it('should list all contexts', function (done) {
    driver
      .contexts().should.eventually.have.length(2)
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
      .elementByCssSelector('input[type=submit]').click()
      .waitForElementByXPath("//h1[contains(., 'This is my way')]")
      .nodeify(done);
  });

  // TODO: clear does not work on selendroid
  it('should clear input @skip-selendroid-all', function (done) {
    var el;
    driver
      .waitForElementById('name_input', 10000, 500)
      .then(function (_el) { el = _el; })
      .then(function () { return safeClear(el); })
      .then(function () { return el.getValue().should.become(""); })
      .nodeify(done);
  });

  // TODO: clear does not work on selendroid
  it('should find and enter key sequence in input @skip-selendroid-all', function (done) {
    var el;
    driver
      .elementById('name_input')
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
      .waitForElementById('name_input') // making sure webview has been loaded
      .source().should.eventually.include("<title>Say Hello Demo<")
      .nodeify(done);
  });
};
