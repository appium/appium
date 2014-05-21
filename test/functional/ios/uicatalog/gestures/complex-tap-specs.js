"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require('../desired');

var SLOW_DOWN_MS = 1000;

describe('uicatalog - gestures - complex tap', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    afterEach(function (done) {
      driver
        .clickButton('UICatalog')
        .sleep(SLOW_DOWN_MS)
        .nodeify(done);
    });
  }

  it('should work with custom options', function (done) {
    var tapOpts = {
      tapCount: 1 // how many taps
    , duration: 2.3 // how long
    , touchCount: 3 // how many fingers
    , x: 100 // in pixels from left
    , y: 200 // in pixels from top
    };
    driver
      .execute("mobile: tap", [tapOpts])
      .elementByXPath("//UIAElement['SYSTEM (CONTACT ADD)']")
        .should.eventually.exist
      .nodeify(done);
  });
  it('should work in relative units', function (done) {
    var tapOpts = {
      tapCount: 1 // how many taps
    , duration: 2.3 // how long
    , touchCount: 3 // how many fingers
    , x: 0.5 // 50% from left of screen
    , y: 0.40 // 55% from top of screen
    };
    driver
      .execute("mobile: tap", [tapOpts])
      .elementByXPath("//UIAElement['SYSTEM (CONTACT ADD)']")
        .should.eventually.exist
      .nodeify(done);
  });
  it('should work with default options', function (done) {
    driver
      .execute("mobile: tap")
      .elementByXPath("//UIAStaticText['Image View']")
        .should.eventually.exist
      .nodeify(done);
  });

  describe('with element', function () {

    it('should work in relative units', function (done) {
      driver
        .elementByXPath("//UIAStaticText[contains(@name, 'Buttons')]")
        .then(function (el) {
          var tapOpts = {
            x: 0.5 // in relative width from left
          , y: 0.5 // in relative height from top
          , element: el.value
          };
          return driver
            .execute("mobile: tap", [tapOpts]);
        }).elementByXPath("//UIAElement['SYSTEM (CONTACT ADD)']")
          .should.eventually.exist
        .nodeify(done);
    });

    it('should work in pixels', function (done) {
      driver
        .elementByXPath("//UIAStaticText[contains(@name, 'Buttons')]")
        .then(function (el) {
          var tapOpts = {
            x: 150 // in pixels from left
          , y: 30 // in pixels from top
          , element: el.value
          };
          return driver
            .execute("mobile: tap", [tapOpts]);
        }).elementByXPath("//UIAElement['SYSTEM (CONTACT ADD)']")
          .should.eventually.exist
        .nodeify(done);
    });
  });
});

