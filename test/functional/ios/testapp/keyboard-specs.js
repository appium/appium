"use strict";

var setup = require("../../common/setup-base")
 ,  desired = require('./desired')
 ,  _ = require('underscore')
 , unorm = require('unorm');

describe('testapp - keyboard', function () {
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

  _.each([undefined, 'oneByOne', 'grouped', 'setValue'], test);

  describe("typing", function () {
    var driver;
    setup(this, _.defaults({
      deviceName: 'iPad 2',
    }, desired)).then(function (d) { driver = d; });

    describe("stability @skip-ci", function () {
      var runs = 10
        , text = 'Delhi is New @@@ BREAKFAST-FOOD-0001';

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


    it('should send accented text', function (done) {
      var testText = unorm.nfd("é Œ ù ḍ");
      driver
        .elementsByClassName('UIATextField').at(1)
          .sendKeys(testText)
          .text()
          .should.become(testText)
        .nodeify(done);
    });

    it('should send backspace key', function (done) {
      driver
        .elementsByClassName('UIATextField').at(1)
          .clear()
          .sendKeys("abcd")
          .sendKeys('\uE003\uE003')
          .text()
          .should.become("ab")
        .nodeify(done);
    });

    it('should send delete key', function (done) {
      driver
        .elementsByClassName('UIATextField').at(1)
          .clear()
          .sendKeys("abcd")
          .sendKeys('\ue017\ue017')
          .text()
          .should.become("ab")
        .nodeify(done);
    });
  });
});
