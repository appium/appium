"use strict";

var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base")
  , desired = require('./desired')
  , _ = require("underscore");

describe('uicatalog - find and act -', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function (done) {
      driver
        .clickBack()
        .nodeify(done);
    });
  }
  
  _.each({'tag name': 'cell', xpath: '//cell'}, function (sel, strat) {
    it('should tap immediately on an element by ' + strat, function (done) {
      var opts = {strategy: strat, selector: sel};
      driver
        .execute("mobile: findAndAct", [opts])
        .elementByName("Gray").should.eventually.exist
        .nodeify(done);
    });
  });
  it('should fail gracefully for not found elements', function (done) {
    var opts = {strategy: 'name', selector: 'doesntexistwot'};
    driver
      .execute("mobile: findAndAct", [opts])
        .should.be.rejectedWith(/status: 7/)
      .nodeify(done);
  });
  it('should fail gracefully for bad strategies', function (done) {
    var opts = {strategy: 'tag namex', selector: 'button'};
    driver
      .execute("mobile: findAndAct", [opts])
      .catch(function (err) {
        err.cause.value.origValue.should.include("tag namex");
        throw err;
      }).should.be.rejectedWith(/status: 13/)
      .nodeify(done);
  });
  it('should work with actions that return values', function (done) {
    var opts = {strategy: 'tag name', selector: 'cell', action: 'name'};
    driver
      .execute("mobile: findAndAct", [opts])
        .should.become("Buttons, Various uses of UIButton")
      .nodeify(done);
  });
  it('should work with actions that take params', function (done) {
    var opts = {strategy: 'tag name', selector: 'textfield', action:
      'setValue', params: ['some great text']};
    driver
      .elementsByTagName('cell').then(function (els) { return els[2]; })
        .click()
      .execute("mobile: findAndAct", [opts]).then(function () {
        opts.action = 'value';
        opts.params = [];
      }).execute("mobile: findAndAct", [opts])
        .should.become("some great text")
      .nodeify(done);
  });
  it('should work with indexes', function (done) {
    var opts = {strategy: 'tag name', selector: 'textfield', action:
      'setValue', params: ['some great text'], index: 1};
    driver
      .elementsByTagName('cell').then(function (els) { return els[2]; })
        .click()
      .execute("mobile: findAndAct", [opts]).then(function () {
        opts.action = 'value';
        opts.params = [];
      }).execute("mobile: findAndAct", [opts])
        .should.become("some great text")
      .nodeify(done);
  });
});
