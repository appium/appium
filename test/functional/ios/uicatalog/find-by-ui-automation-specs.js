"use strict";

var setup = require("../../common/setup-base")
  , desired = require('./desired')
  , Q = require("q")
  , _ = require("underscore")
  , filterVisible = require('../../../helpers/ios-uiautomation').filterVisible;

describe('uicatalog - find by ios-ui-automation @skip-ios6', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  var byUIA = '-ios uiautomation';

  var filterDisplayed = function (els) {
    return Q.all(_.map(els, function (el) { return el.isDisplayed(); }))
      .then(function (res) { return _.filter(els, function (el, i) { return res[i]; }); });
  };

  before(function (done) {
    driver
      .element(byUIA, '.navigationBars()[0]')
        .getAttribute('name').then(function (name) {
          if (name !== 'UICatalog') {
            return driver.clickButton('UICatalog').delay(2000);
          } else {
            return Q.delay(500);
          }
        }
      ).nodeify(done);
  });

  it('should process most basic UIAutomation query', function (done) {
    driver
      .elements(byUIA, '.elements()').then(filterDisplayed)
        .should.eventually.have.length(2)
      .nodeify(done);
  });
  it('should use raw selector code if selector doesn\'t start with a dot' , function (done) {
    driver
      .elements(byUIA, '$.mainWindow().elements()').then(filterDisplayed)
        .should.eventually.have.length(2)
      .nodeify(done);
  });
  it('should get a single element', function (done) {
    driver.element(byUIA, '.elements()[0]').getAttribute('name')
      .should.become('UICatalog')
    .nodeify(done);
  });
  it('should get a single element', function (done) {
    driver.element(byUIA, '.elements()[1]').getAttribute('name')
      .should.become('Empty list')
    .nodeify(done);
  });
  it('should get single element as array', function (done) {
    driver
      .elements(byUIA, '.tableViews()[0]')
        .should.eventually.have.length(1)
      .nodeify(done);
  });
  it('should find elements by index multiple times', function (done) {
    driver
      .element(byUIA, '.elements()[1].cells()[2]').getAttribute('name')
        // TODO: the cells index looks wrong, should start at 1, investigate
      .should.become('Alert Views, AAPLAlertViewController')
    .nodeify(done);
  });
  it('should find elements by name', function (done) {
    driver.element(byUIA, '.elements()["UICatalog"]').getAttribute('name')
      .should.become('UICatalog')
    .nodeify(done);
  });
  it('should find elements by name and index', function (done) {
    driver.element(byUIA, '.elements()["Empty list"].cells()[3]').getAttribute('name')
      // TODO: the cells index looks wrong, should start at 1, investigate
      .should.become('Buttons, AAPLButtonViewController')
    .nodeify(done);
  });
  describe('start from a given context instead of root target', function () {
    it('should process a simple query', function (done) {
      driver.element(byUIA, '.elements()[1]').then(function (el) {
        el
          .elements(byUIA, filterVisible('.elements();'))
            .should.eventually.have.length(12)
          .nodeify(done);
      });
    });
    it('should find elements by name', function (done) {
      driver.element(byUIA, '.elements()[1]').then(function (el) {
        el
        .element(byUIA, '.elements()["Buttons, AAPLButtonViewController"]')
          .should.eventually.exist
        .nodeify(done);
      });
    });
  });
});
