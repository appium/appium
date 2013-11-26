"use strict";

var setup = require("../../common/setup-base")
  , desired = require("./desired"),
  _ = require('underscore');

describe("apidemo - keyboard -", function () {
  var driver;
  setup(this,  _.defaults({'app-activity': "view.Controls1" }, desired))
   .then(function (d) { driver = d; });

  it('should be able to edit a text field', function (done) {
    var testText = "this is awesome!";
    var el = function () { return driver.elementByTagName('editText'); };
    driver
      .resolve(el()).clear().text().should.become("")
      .then(el).sendKeys(testText).text().should.become(testText)
      .nodeify(done);
  });

  //todo: not working in nexus 7
  it('should be able to edit and clear a text field', function (done) {
    var testText = "this is awesome!";
    var el = function () { return driver.elementByTagName('editText'); };
    driver
      .resolve(el()).clear().text().should.become("")
      .then(el).sendKeys(testText).text().should.become(testText)
      .then(el).clear().text().should.become("")
      .nodeify(done);
  });
});
