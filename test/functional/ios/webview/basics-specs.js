"use strict";

var setup = require("../../common/setup-base")
  , desired = require('./desired')
  , _ = require('underscore')
  , env = require('../../../helpers/env');

describe('webview - basics', function () {

  var driver;

  setup(this, desired).then(function (d) { driver = d; });

  it('getting current context should return NATIVE_APP when none set', function (done) {
    driver.currentContext().should.eventually.equal("NATIVE_APP")
      .nodeify(done);
  });
  it('getting list should work after webview open', function (done) {
    driver.contexts().should.eventually.have.length.above(0)
      .nodeify(done);
  });
  it('getting list multiple times should not crash appium', function (done) {
    driver
      .contexts().should.eventually.have.length.above(0)
      .contexts().should.eventually.have.length.above(0)
      .contexts().should.eventually.have.length.above(0)
      .contexts().should.eventually.have.length.above(0)
      .contexts().should.eventually.have.length.above(0)
      .contexts().should.eventually.have.length.above(0)
      .contexts().should.eventually.have.length.above(0)
      .nodeify(done);
  });
  it('contexts should be strings', function (done) {
    driver.contexts().then(function (ctxs) {
      ctxs.length.should.be.above(0);
      _.each(ctxs, function (ctx) {
        (typeof ctx).should.equal("string");
      });
    }).nodeify(done);
  });
  it('setting context to \'WEBVIEW_1\' should work', function (done) {
    driver
      .contexts().should.eventually.have.length.above(0)
      .context("WEBVIEW_1")
      .sleep(500)
      .get(env.GUINEA_TEST_END_POINT)
      .sleep(500)
      .title()
      .should.eventually.equal("I am a page title")
      .nodeify(done);
  });
  it('setting context to \'WEBVIEW_1\' should work without first getting contexts', function (done) {
    driver
      .context("WEBVIEW_1")
      .sleep(500)
      .get(env.GUINEA_TEST_END_POINT)
      .sleep(500)
      .title()
      .should.eventually.equal("I am a page title")
      .nodeify(done);
  });
  it('setting context to \'WEBVIEW\' should work', function (done) {
    driver
      .context("WEBVIEW")
      .sleep(500)
      .get(env.GUINEA_TEST_END_POINT)
      .sleep(500)
      .title()
      .should.eventually.equal("I am a page title")
      .nodeify(done);
  });
  it('setting context to \'null\' should work', function (done) {
    driver.contexts().then(function (ctxs) {
      ctxs.length.should.be.above(0);
      return ctxs[0];
    }).then(function (ctx) {
      return driver.context(ctx);
    })
    .context(null)
    .nodeify(done);
  });
  it('returning to \'NATIVE_APP\' should work', function (done) {
    driver.contexts().then(function (ctxs) {
      ctxs.length.should.be.above(0);
      return ctxs[0];
    }).then(function (ctx) {
      return driver.context(ctx);
    })
    .context('NATIVE_APP')
    .nodeify(done);
  });

  it('setting context to non-existent context should return \'NoSuchContext\' (status: 35)', function (done) {
    driver
      .context("WEBVIEW_42")
      .should.be.rejectedWith(/status: 35/)
      .nodeify(done);
  });

  it('switching back and forth between native and webview contexts should work @skip-ios6', function (done) {
    driver
      .contexts()
      .context("WEBVIEW_1")
      .get(env.GUINEA_TEST_END_POINT)
      .sleep(3000)
      .title()
      .should.eventually.equal("I am a page title")
      .context("NATIVE_APP")
      .context("WEBVIEW_1")
      .get(env.GUINEA_TEST_END_POINT)
      .sleep(3000)
      .elementByLinkText('i am a link').click()
      .elementById('only_on_page_2').should.eventually.exist
      .nodeify(done);
  });
});
