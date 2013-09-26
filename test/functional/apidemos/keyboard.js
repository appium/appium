"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = "view.Controls1"
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath,
      "android", appPkg, appAct)
  , it = require("../../helpers/driverblock.js").it
  , should = require('should');

describeWd('text boxes', function(h) {
  var testText = "this is awesome!";
  it('should be settable with sendkeys', function(done) {
    h.driver.elementByTagName('editText', function(err, el) {
      should.not.exist(err);
      el.text(function(err, text) {
        should.not.exist(err);
        text.should.equal("");
        el.sendKeys(testText, function(err) {
          should.not.exist(err);
          el.text(function(err, text) {
            should.not.exist(err);
            text.should.equal(testText);
            done();
          });
        });
      });
    });
  });
  it('should be able to clear editText', function(done) {
    h.driver.elementByTagName('editText', function(err, el) {
      should.not.exist(err);
      // get the text
      el.text(function(err, text) {
        should.not.exist(err);
        text.should.equal("");
        // set the text
        el.sendKeys(testText, function(err) {
          should.not.exist(err);
          // make sure the text is actuall in the edittext
          el.text(function(err, text) {
            should.not.exist(err);
            text.should.equal(testText);
            // now clear it
            el.clear(function(err) {
              should.not.exist(err);
              // make sure that it's empty
              el.text(function(err, text) {
                should.not.exist(err);
                text.should.equal("");
                done();
              });
            });
          });
        });
      });
    });
  });
});
