/*global beforeEach:true */
"use strict";

var env = require('./env')
  , setup = require("../functional/common/setup-base")
  , path = require('path');

var desired = {
  app: path.resolve(__dirname, "../../sample-code/apps/selendroid-test-app.apk"),
  appPackage: 'io.selendroid.testapp',
  appActivity: '.HomeScreenActivity'
};

module.exports = function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  beforeEach(function (done) {
    driver
      .waitForElementByName('buttonStartWebviewCD').click()
      .sleep(500)
      .context('WEBVIEW')
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
            return driver.elementByTagNameOrNull('button');
          }
        })
        .then(function (el) {
          if (el) return el.click().sleep(1000);
        }).nodeify(done);
    });
  }

  it('should be web view', function (done) {
    // todo: add some sort of check here
    done();
  });

  it('should list all contexts', function (done) {
    driver
      .contexts().should.eventually.have.length.above(0)
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

  // selendroid test app is busted
  it('should clear input @skip-selendroid-all', function (done) {
    driver
      .elementById('name_input').click().clear().getValue().should.become("")
      .nodeify(done);
  });

  // selendroid test app is busted
  it('should find and enter key sequence in input @skip-selendroid-all', function (done) {
    driver
      .elementById('name_input').clear()
        .type("Mathieu").getValue().should.become("Mathieu")
      .nodeify(done);
  });

  it('should be able to handle selendroid special keys @skip-android-all', function (done) {
    driver.keys('\uE102').nodeify(done);
  });

  it('should get web source', function (done) {
    driver
      .source().should.eventually.include("<title>Say Hello Demo<")
      .nodeify(done);
  });
};
