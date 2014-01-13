"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = "view.Controls1"
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath,
      "android", appPkg, appAct)
  , it = require("../../helpers/driverblock.js").it;

describeWd('text boxes', function(h) {

  it('should be able to edit a text field', function(done) {
    var testText = "this is awesome!";
    var el = function() { return h.driver.elementByTagName('editText'); };
    h.driver
      .resolve(el()).clear().text().should.become("")
      .then(el).sendKeys(testText).text().should.become(testText)
      .nodeify(done);
  });

  //todo: not working in nexus 7
  it('should be able to edit and clear a text field', function(done) {
    var testText = "this is awesome!";
    var el = function() { return h.driver.elementByTagName('editText'); };
    h.driver
      .resolve(el()).clear().text().should.become("")
      .then(el).sendKeys(testText).text().should.become(testText)
      .then(el).clear().text().should.become("")
      .nodeify(done);
  });

});
