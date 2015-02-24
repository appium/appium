"use strict";

var env = require('../../../helpers/env'),
    setup = require("../../common/setup-base");

describe('safari - page load timeout @skip-ios6', function () {
  if (env.IOS81) {
    describe('small timeout, slow page load', function () {
      var driver;
      setup(this, {browserName: 'safari'})
        .then(function (d) { driver = d; });
      it('should go to the requested page', function () {
        return driver
          .setPageLoadTimeout(5000)
          .get(env.GUINEA_TEST_END_POINT + '?delay=30000')
          // the page should not have time to load
          .source().should.eventually.include('Let\'s browse!');
      });
    });

    describe('no timeout, very slow page', function () {
      var startMs = Date.now();
      var driver;
      setup(this, {browserName: 'safari'})
        .then(function (d) { driver = d; });
      it('should go to the requested page', function () {
        return driver
          .setCommandTimeout(120000)
          .setPageLoadTimeout(-1)
          .get(env.GUINEA_TEST_END_POINT + '?delay=70000')
          // the page should load after 70000
          .source().should.eventually.include('I am some page content')
          .then(function () {
            (Date.now() -startMs).should.be.above(70000);
          });
      });
    });
  }
});
