/*global beforeEach:true */
"use strict";

var env = require('../../helpers/env')
  , setup = require("../common/setup-base")
  , path = require('path');

var desired = {
  app: path.resolve(__dirname, "../../../sample-code/apps/WebViewDemo/target/selendroid-test-app-0.7.0.apk"),
  'app-package': 'io.selendroid.testapp',
  'app-activity': '.HomeScreenActivity'
};

// if it doesn't work run: adb uninstall io.selendroid.testapp

describe('web view', function() {
 var browser;
  setup(this, desired)
   .then( function(_browser) { browser = _browser; } );

  beforeEach(function(done) {
    browser
      .waitForElementById('buttonStartWebView').click()
      .window('WEBVIEW')
      .nodeify(done);
  });

  if (env.FAST_TESTS) {
    afterEach(function(done) {
      browser
        .window('NATIVE_APP')
        .elementByIdOrNull('goBack').then(function(el) {
          if (el) return el.click().sleep(1000);
        }).nodeify(done);
    });
  }
  
  it('should be web view', function(done) {
    // todo: add some sort of check here
    done();
  });

  it('should find and click an element', function(done) {
    browser
      .elementByCssSelector('input[type=submit]').click()
      .sleep(1000)
      .elementByTagName('h1').text()
        .should.become("This is my way of saying hello")
      .nodeify(done);
  });

  it('should clear input', function(done) {
    browser
      .elementById('name_input').clear().getValue().should.become("")
      .nodeify(done);
  });

  it('should find and enter key sequence in input', function(done) {
    browser
      .elementById('name_input').clear()
        .type("Mathieu").getValue().should.become("Mathieu")
      .nodeify(done);
  });

  it('should be able to handle selendroid special keys', function(done) {
    browser.keys('\uE102').nodeify(done);
  });

  it('should get web source', function(done) {
    browser
      .source().should.eventually.include("body")
      .nodeify(done);
  });

});
