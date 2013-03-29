/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , _ = require("underscore")
  , should = require('should');

describeWd('findAndAct', function(h) {
  _.each({'tag name': 'cell', xpath: '//cell'}, function(sel, strat) {
    it('should tap immediately on an element by ' + strat, function(done) {
      var opts = {strategy: strat, selector: sel};
      h.driver.execute("mobile: findAndAct", [opts], function(err) {
        should.not.exist(err);
        h.driver.elementByName("Gray", function(err) {
          should.not.exist(err);
          done();
        });
      });
    });
  });
  it('should fail gracefully for not found elements', function(done) {
    var opts = {strategy: 'name', selector: 'doesntexistwot'};
    h.driver.execute("mobile: findAndAct", [opts], function(err) {
      should.exist(err);
      err.status.should.equal(7);
      done();
    });
  });
  it('should fail gracefully for bad strategies', function(done) {
    var opts = {strategy: 'tag namex', selector: 'button'};
    h.driver.execute("mobile: findAndAct", [opts], function(err) {
      should.exist(err);
      err.status.should.equal(13);
      err.cause.value.origValue.should.include("tag namex");
      done();
    });
  });
  it('should work with actions that return values', function(done) {
    var opts = {strategy: 'tag name', selector: 'cell', action: 'name'};
    h.driver.execute("mobile: findAndAct", [opts], function(err, name) {
      should.not.exist(err);
      name.should.equal("Buttons, Various uses of UIButton");
      done();
    });
  });
  it('should work with actions that take params', function(done) {
    h.driver.elementsByTagName('cell', function(err, cells) {
      cells[2].click(function(err) {
        should.not.exist(err);
        var opts = {strategy: 'tag name', selector: 'textfield', action:
          'setValue', params: ['some great text']};
        h.driver.execute("mobile: findAndAct", [opts], function(err) {
          should.not.exist(err);
          opts.action = 'value';
          opts.params = [];
          h.driver.execute("mobile: findAndAct", [opts], function(err, val) {
            should.not.exist(err);
            val.should.equal("some great text");
            done();
          });
        });
      });
    });
  });
  it('should work with indexes', function(done) {
    h.driver.elementsByTagName('cell', function(err, cells) {
      cells[2].click(function(err) {
        should.not.exist(err);
        var opts = {strategy: 'tag name', selector: 'textfield', action:
          'setValue', params: ['some great text'], index: 1};
        h.driver.execute("mobile: findAndAct", [opts], function(err) {
          should.not.exist(err);
          opts.action = 'value';
          opts.params = [];
          h.driver.execute("mobile: findAndAct", [opts], function(err, val) {
            should.not.exist(err);
            val.should.equal("some great text");
            done();
          });
        });
      });
    });
  });
});
