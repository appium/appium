// This is basically a port of webdriver-test.py
// https://github.com/hugs/appium/blob/master/sample-code/webdriver-test.py
"use strict";

var driverblock = require("../../helpers/driverblock.js")
  , Q = driverblock.Q
  , it = driverblock.it
  , describeWd = require("../../helpers/driverblock.js").describeForApp('TestApp')
  , _ = require('underscore');

describeWd('calc app', function(h) {
  var values = [];
  var populate = function(driver) {
    return driver.elementsByTagName('textField').then(function(elems) {
      var sequence = _(elems).map(function(elem) {
        var val = Math.round(Math.random()*10);
        values.push(val);
        return function() { return elem.sendKeys(val); };
      });
      return sequence.reduce(Q.when, new Q()); // running sequence
    });
  };

  it('should fill two fields with numbers', function(done) {
    var driver = h.driver;
    populate(driver).then(function() {
      return driver
        .elementByTagName('button').click()
        .elementByTagName('staticText').text().then(function(text) {
          parseInt(text, 10).should.equal(values[0] + values[1]);
        });
    }).nodeify(done);
  });
});
