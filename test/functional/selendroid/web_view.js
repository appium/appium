/*global beforeEach:true */
"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/WebViewDemo/target/selendroid-test-app-0.7.0.apk")
  , appPkg = "io.selendroid.testapp"
  , appAct = ".HomeScreenActivity"
  , driverBlock = require("../../helpers/driverblock.js")
  , it = driverBlock.it
  , describeWd = driverBlock.describeForApp(appPath, "selendroid", appPkg, appAct)
  , exec = require('child_process').exec;

// if it doesn't work run: adb uninstall io.selendroid.testapp

describeWd('web view', function(h) {
  beforeEach(function(done) {
    h.driver
      .waitForElementById('buttonStartWebView').click()
      .window('WEBVIEW')
      .nodeify(done);
  });

  if (process.env.FAST_TESTS) {
    afterEach(function(done) {
      h.driver
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
    h.driver
      .elementByCssSelector('input[type=submit]').click()
      .sleep(1000)
      .elementByTagName('h1').text()
        .should.become("This is my way of saying hello")
      .nodeify(done);
  });

  it('should clear input', function(done) {
    h.driver
      .elementById('name_input').clear().getValue().should.become("")
      .nodeify(done);
  });

  it('should find and enter key sequence in input', function(done) {
    h.driver
      .elementById('name_input').clear()
        .type("Mathieu").getValue().should.become("Mathieu")
      .nodeify(done);
  });

  it('should be able to handle selendroid special keys', function(done) {
    h.driver.keys('\uE102').nodeify(done);
  });

  it('should get web source', function(done) {
    h.driver
      .source().should.eventually.include("body")
      .nodeify(done);
  });

});
