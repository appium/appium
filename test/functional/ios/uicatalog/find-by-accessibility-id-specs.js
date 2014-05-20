"use strict";

var setup = require("../../common/setup-base")
  , desired = require('./desired');

describe('uicatalog - find by accessibility id', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  afterEach(function (done) {
    driver.clickButton('UICatalog')
    .nodeify(done);
  });
  it('should find an element', function (done) {
    driver.element('accessibility id', 'UICatalog').then(function (el) {
      el.should.exist;
    }).nodeify(done);
  });
  it('should find a deeply nested element', function (done) {
    driver
      .elementByXPath("//UIAStaticText[contains(@label,'Action Sheets')]").click()
      .element('accessibility id', 'Okay / Cancel').then(function (el) {
        el.should.exist;
      })
      .nodeify(done);
  });
  it('should find an element by name beneath another element @skip-ios7', function (done) {
    // TODO: this does not work
    driver
      .elementByXPath("//UIAStaticText[contains(@label,'Action Sheets')]").click()
      .element('accessibility id', 'Empty list').then(function (el) {
        el.element('accessibility id', 'Other')
        .then(function (innerEl) {
          innerEl.should.exist;
        })
        .nodeify(done);
    });
  });
  it('should return an array of one element if the plural "elements" is used', function (done) {
    driver
      .elementByXPath("//UIAStaticText[contains(@label,'Action Sheets')]").click()
      .elements('accessibility id', 'Okay / Cancel').then(function (els) {
        els.length.should.equal(1);
      })
      .nodeify(done);
  });
});
