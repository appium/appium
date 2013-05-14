/*global it:true beforeEach:true*/
"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/WebViewDemo/target/selendroid-test-app-0.4-SNAPSHOT.apk")
  , appPkg = "org.openqa.selendroid.testapp"
  , appAct = "HomeScreenActivity"
  , driverBlock = require("../../helpers/driverblock.js")
  , describeWd = driverBlock.describeForApp(appPath, "selendroid", appPkg, appAct)
  , should = require('should');


describeWd('switch to web view', function(h) {
    it('should go to web view', function(done) {
      setTimeout(function() {
        h.driver.elementById('buttonStartWebView', function(err, el) {
          should.not.exist(err);
          should.exist(el);
          el.click(function(err) {
            should.not.exist(err);
            h.driver.window('WEBVIEW', function(err) {
              should.not.exist(err);
              done();
            });
          });
        });
      }, 1000);
    });
});

describeWd('web view', function(h) {
  beforeEach(function(done) {
    setTimeout(function() {
      h.driver.elementById('buttonStartWebView', function(err, el) {
        el.click(function(err) {
          h.driver.window('WEBVIEW', function(err) {
            done();
          });
        });
      });
    }, 1000);
  });
  it('should find and click an element', function(done) {
    h.driver.elementByCssSelector('input[type=submit]', function(err, el) {
      should.not.exist(err);
      should.exist(el);
      el.click(function(err) {
        should.not.exist(err);
        setTimeout(function() {
          h.driver.elementByTagName('h1', function(err, h1) {
            should.not.exist(err);
            should.exist(h1);
            h1.text(function(err, value) {
              should.not.exist(err);
              should.exist(value);
              value.should.equal("This is my way of saying hello");
              done();
            });
          });
        }, 1000);
      });
    });
  });
  it('should clear input', function(done) {
    h.driver.elementById('name_input', function(err, inputField) {
      should.not.exist(err);
      inputField.clear(function(err) {
        should.not.exist(err);
        inputField.getValue(function(err, value) {
          value.should.equal("");
          done();
        });
      });
    });
  });
  it('should find and enter key sequence in input', function(done) {
    h.driver.elementById('name_input', function(err, inputField) {
      should.not.exist(err);
      inputField.clear(function(err) {
        inputField.type("Mathieu", function(err) {
          inputField.getValue(function(err, value) {
            value.should.equal("Mathieu");
            done();
          });
        });
      });
    });
  });
});
