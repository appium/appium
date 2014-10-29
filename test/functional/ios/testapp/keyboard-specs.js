"use strict";

var setup = require("../../common/setup-base")
 ,  desired = require('./desired')
 ,  _ = require('underscore');

describe('testapp', function () {
  var ctx = this;

  var test = function (strategy) {
    describe('typing with strategy:' + (strategy || 'undefined'), function () {
      var text = 'Appium Rocks';

      var driver;
      var _desired = _.clone(desired);
      if (strategy) _desired.sendKeyStrategy = strategy;
      setup(ctx, _desired).then(function (d) { driver = d; });

      it("should send keys to a text field", function (done) {
        driver
          .execute('env')
          .then( function (env) {
            if (strategy) env.sendKeyStrategy.should.equal(strategy);
            else env.sendKeyStrategy.should.equal('oneByOne');
          })
          .elementByClassName('UIATextField')
            .clear()
            .sendKeys(text)
            .text().then(function (text) {
              if (strategy === 'grouped') {
                text.length.should.be.above(0);
              } else {
                text.should.equal(text);
              }
            }).nodeify(done);
      });
    });
  };

  test();
  test('oneByOne');
  test('grouped');
  test('setValue');

  describe("keyboard stability @skip-ci", function () {
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


});
