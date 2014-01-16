"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , it = require("../../helpers/driverblock.js").it
  , _ = require("underscore");

describeWd('findAndAct', function(h) {
  if (process.env.FAST_TESTS) {
    beforeEach(function(done) {
      h.driver
        .elementByNameOrNull('Back')
        .then(function(el) { if (el) return el.click(); })
        .nodeify(done);
    });
  }
  
  _.each({'tag name': 'cell', xpath: '//cell'}, function(sel, strat) {
    it('should tap immediately on an element by ' + strat, function(done) {
      var opts = {strategy: strat, selector: sel};
      h.driver
        .execute("mobile: findAndAct", [opts])
        .elementByName("Gray").should.eventually.exist
        .nodeify(done);
    });
  });
  it('should fail gracefully for not found elements', function(done) {
    var opts = {strategy: 'name', selector: 'doesntexistwot'};
    h.driver
      .execute("mobile: findAndAct", [opts])
        .should.be.rejectedWith(/status: 7/)
      .nodeify(done);
  });
  it('should fail gracefully for bad strategies', function(done) {
    var opts = {strategy: 'tag namex', selector: 'button'};
    h.driver
      .execute("mobile: findAndAct", [opts])
      .catch(function(err) {
        err.cause.value.origValue.should.include("tag namex");
        throw err;
      }).should.be.rejectedWith(/status: 13/)
      .nodeify(done);
  });
  it('should work with actions that return values', function(done) {
    var opts = {strategy: 'tag name', selector: 'cell', action: 'name'};
    h.driver
      .execute("mobile: findAndAct", [opts])
        .should.become("Buttons, Various uses of UIButton")
      .nodeify(done);
  });
  it('should work with actions that take params', function(done) {
    var opts = {strategy: 'tag name', selector: 'textfield', action:
      'setValue', params: ['some great text']};
    h.driver
      .elementsByTagName('cell').then(function(els) { return els[2]; })
        .click()
      .execute("mobile: findAndAct", [opts]).then(function() {
        opts.action = 'value';
        opts.params = [];
      }).execute("mobile: findAndAct", [opts])
        .should.become("some great text")
      .nodeify(done);
  });
  it('should work with indexes', function(done) {
    var opts = {strategy: 'tag name', selector: 'textfield', action:
      'setValue', params: ['some great text'], index: 1};
    h.driver
      .elementsByTagName('cell').then(function(els) { return els[2]; })
        .click()
      .execute("mobile: findAndAct", [opts]).then(function() {
        opts.action = 'value';
        opts.params = [];
      }).execute("mobile: findAndAct", [opts])
        .should.become("some great text")
      .nodeify(done);
  });
});
