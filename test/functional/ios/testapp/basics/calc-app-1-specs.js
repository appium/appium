"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require('../desired')
  , Q =  require("q")
  , _ = require("underscore")
  , filterVisible = require('../../../../helpers/ios-uiautomation').filterVisible;

describe('testapp - basics - calc app 1', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  var values = null;

  var clearFields = function (driver) {
    values = [];
    return driver
      .elementsByClassName('UIATextField').then(function (elems) {
        var sequence = _(elems).map(function (elem) {
          return function () { return elem.clear(); };
        });
        return sequence.reduce(Q.when, new Q()); // running sequence
      }).then(function () {
        return driver.elementByClassName('UIAButton').click();
      });
  };

  var populate = function (type, driver) {
    values = [];
    return driver
      .elementsByIosUIAutomation(filterVisible('.textFields();'))
      .then(function (elems) {
        var sequence = _(elems).map(function (elem) {
          var val = Math.round(Math.random() * 10);
          values.push(val);
          if (type === "elem") {
            return function () { return elem.sendKeys(val); };
          } else if (type === "elem-setvalue") {
            return function () { return elem.setImmediateValue(val); };
          } else if (type === "driver") {
            return function () { return elem.click().keys(val); };
          }
        });
        return sequence.reduce(Q.when, new Q()); // running sequence
      });
  };

  var computeAndCheck = function (driver) {
    return driver
      .elementByClassName('UIAButton').click()
      .elementByClassName('UIAStaticText').text().then(function (text) {
        parseInt(text, 10).should.equal(values[0] + values[1]);
      });
  };

  if (env.FAST_TESTS) {
    beforeEach(function (done) {
      clearFields(driver).nodeify(done);
    });
  }

  it('should fill two fields with numbers', function (done) {
    populate("elem", driver)
      .then(computeAndCheck.bind(null, driver))
      .nodeify(done);
  });

  // using sendKeysToActiveElement
  it('should fill two fields with numbers - sendKeys', function (done) {
    populate("driver", driver)
      .then(computeAndCheck.bind(null, driver))
      .nodeify(done);
  });

  it('should fill two fields with numbers - setValue', function (done) {
    populate("elem-setvalue", driver)
      .then(computeAndCheck.bind(null, driver))
      .nodeify(done);
  });

  it('should confirm that button is displayed', function (done) {
    driver
      .elementByClassName('UIATextField').isDisplayed()
        .should.eventually.be.ok
      .nodeify(done);
  });

  it('should confirm that the disabled button is disabled', function (done) {
    driver
      .elementByName('DisabledButton').isEnabled()
        .should.not.eventually.be.ok
      .nodeify(done);
  });

  it('should confirm that the compute sum button is enabled', function (done) {
    driver
      .elementByName('ComputeSumButton').isEnabled()
        .should.eventually.be.ok
      .nodeify(done);
  });

  it('should interact with alert', function (done) {
    driver.elementsByClassName('UIAButton').then(function (buttons) {
      return buttons[1];
    }).then(function (button) {
      return button
        .click()
        .acceptAlert()
        .then(function () { return button.click(); })
        .alertText().then(function (text) {
          text.should.include("Cool title");
          text.should.include("this alert is so cool.");
        }).dismissAlert();
    })
    .nodeify(done);
  });


  it('should find alert like other elements', function (done) {
    driver.elementsByClassName('UIAButton').then(function (buttons) {
      return buttons[1];
    }).then(function (button) {
      return button.click()
        .elementByClassName('UIAAlert')
        // maybe we could get alert body text too?
        .elementByClassName('>', 'UIAStaticText').text().should.become("Cool title")
        .dismissAlert();
    })
    .nodeify(done);
  });

  it('should get tag names of elements', function (done) {
    driver
      .elementByClassName('UIAButton').getTagName().should.become("UIAButton")
      .elementByClassName('UIAStaticText').getTagName().should.become("UIAStaticText")
      .nodeify(done);
  });

  it('should be able to get text of a button', function (done) {
    driver
      .elementByClassName('UIAButton').text().should.become("ComputeSumButton")
      .nodeify(done);
  });
});
