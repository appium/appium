"use strict";

var setup = require("../../common/setup-base")
 ,  desired = require('./desired')
 ,  _ = require('underscore');


describe("testapp - keyboard stability @skip-ci", function () {
  var runs = 10
    , text = 'Delhi is New @@@ BREAKFAST-FOOD-0001';

  var driver;
  setup(this, _.defaults({
    deviceName: 'iPad 2',
  }, desired)).then(function (d) { driver = d; });

  var test = function () {
    it("should send keys to a text field", function (done) {
      driver
        .elementByClassName('UIATextField')
          .clear()
          .sendKeys(text)
          .text().should.become(text)
        .nodeify(done);
    });
  };

  for (var n = 0; n < runs; n++) {
    describe('sendKeys test ' + (n + 1), test);
  }
});
