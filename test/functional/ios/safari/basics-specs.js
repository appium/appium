"use strict";

var env = require('../../../helpers/env'),
    setup = require("../../common/setup-base");

describe('safari - basics @skip-ios6', function () {
  if (env.IOS81) {
    describe('default init' ,function () {
      var driver;
      setup(this, {browserName: 'safari'}).then(function (d) { driver = d; });
      it('it should use appium default init page', function (done) {
        driver
          .source().should.eventually.include('Let\'s browse!')
          .nodeify(done);
      });
    });

    describe('init with safariInitialUrl', function () {
      var driver;
      setup(this, {browserName: 'safari', safariInitialUrl: env.GUINEA_TEST_END_POINT})
        .then(function (d) { driver = d; });
      it('should go to the requested page', function () {
        return driver
          .source().should.eventually.include('I am some page content');
      });
    });
  } else {
    describe('default init' ,function () {
      var driver;
      setup(this, {browserName: 'safari'}).then(function (d) { driver = d; });
      it('it should use appium default init page', function (done) {
        driver
          .source().should.eventually.include('Apple')
          .nodeify(done);
      });
    });
  }
});
