"use strict";

var driverBlock = require('../helpers/driverblock_harmony.js')
  , describe = driverBlock.describeForApp('UICatalog')
  , it = driverBlock.it
  , should = require('should');

describe('basic', function(h) {

  it('should confirm element is not visible', function*() {
    yield (yield h.driver.byTagName('tableCell')).click();
    var el = yield h.driver.byName("UIButtonTypeContactAdd");
    (yield el.displayed()).should.equal(false);
  });

  it('should confirm element is visible', function*() {
    yield (yield h.driver.byTagName('tableCell')).click();
    var el = yield h.driver.byName("UIButtonTypeRoundedRect");
    (yield el.displayed()).should.equal(true);
  });

  it('should confirm element is selected', function*() {
    yield (yield h.driver.byXPath("text[contains(@text, 'Picker')]")).click();
    var el = yield h.driver.byXPath("button[contains(@text, 'UIPicker')]");
    (yield el.selected()).should.equal(true);
  });

  it('should confirm element is not selected returns false', function*() {
    yield (yield h.driver.byXPath("text[contains(@text, 'Picker')]")).click();
    var el = yield h.driver.byXPath("button[contains(@text, 'Custom')]");
    (yield el.selected()).should.equal(false);
  });

});

