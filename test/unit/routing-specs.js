"use strict";

var rest = require('express')()
  , appium = require('../../lib/appium');

describe('Appium', function () {
  var inst = appium({});

  describe('#attachTo', function () {
    return it('should get valid routes', function (done) {
      inst.attachTo(rest);
      done();
    });
  });
});
