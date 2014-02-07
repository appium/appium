/*global beforeEach:true */
"use strict";

process.env.DEVICE = process.env.DEVICE || "selendroid";
var env = require('../../helpers/env')
  , setup = require("../common/setup-base")
  , path = require('path');

var desired = {
  app: path.resolve(__dirname, "../../../sample-code/apps/WebViewDemo/target/" +
                    "selendroid-test-app-0.8.0.apk"),
  'app-package': 'io.selendroid.testapp',
  'app-activity': '.HomeScreenActivity'
};

// if it doesn't work run: adb uninstall io.selendroid.testapp

describe('selendroid - web_view -', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  beforeEach(function (done) {
    driver
      .waitForElementById('buttonStartWebView').click()
      .window('WEBVIEW')
      .nodeify(done);
  });

  if (env.FAST_TESTS) {
    afterEach(function (done) {
      driver
        .window('NATIVE_APP')
        .elementByIdOrNull('goBack').then(function (el) {
          if (el) return el.click().sleep(1000);
        }).nodeify(done);
    });
  }

  it('should be web view', function (done) {
    // todo: add some sort of check here
    done();
  });

  it('should find and click an element', function (done) {
    driver
      .elementByCssSelector('input[type=submit]').click()
      .sleep(1000)
      .elementByTagName('h1').text()
        .should.become("This is my way of saying hello")
      .nodeify(done);
  });

  it('should clear input', function (done) {
    driver
      .elementById('name_input').clear().getValue().should.become("")
      .nodeify(done);
  });

  it('should find and enter key sequence in input', function (done) {
    driver
      .elementById('name_input').clear()
        .type("Mathieu").getValue().should.become("Mathieu")
      .nodeify(done);
  });

  it('should be able to handle selendroid special keys', function (done) {
    driver.keys('\uE102').nodeify(done);
  });

  it('should get web source', function (done) {
    driver
      .source().should.eventually.include("children")
      .nodeify(done);
  });

});
