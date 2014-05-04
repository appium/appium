"use strict";

var rest = require('express')()
  , appium = require('../../lib/appium');

describe('Appium', function () {
  var inst = appium({});
  rest.use(rest.router);

  describe('#attachTo', function () {
    return it('should get valid routes', function (done) {
      inst.attachTo(rest);
      done();
    });
  });
});
