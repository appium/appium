// This is basically a port of webdriver-test.py
// https://github.com/hugs/appium/blob/master/sample-code/webdriver-test.py
"use strict";

var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base")
  , desired = require('./desired')
  , Q =  require("q")
  , fs = require('fs')
  , path = require('path')
  , _ = require("underscore")
  , filterVisible = require('../../../helpers/ios-uiautomation').filterVisible;

describe('testapp - basic', function () {

  describe('using calc app - 1', function () {
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

  }); // end describe

  describe('using calc app - 2', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    var sum = 0
      , lookup = function (textFieldNum) {
          var num = Math.round(Math.random() * 10000);
          sum += num;
          return driver
            .elementByName('TextField' + textFieldNum)
            .sendKeys(num);
        };

    it('should lookup two fields by name and populate them with ' +
        'random numbers to finally sum them up', function (done) {
      driver.elementByName('SumLabel').then(function (sumLabel) {
        return driver.chain()
          .then(lookup.bind(null, 1))
          .then(lookup.bind(null, 2))
          .elementByName('ComputeSumButton').click()
          .then(function () { return sumLabel.text(); })
          .then(function (text) { parseInt(text, 10).should.equal(sum); });
      }).nodeify(done);
    });

    it('should receive correct error', function (done) {
      driver
        .execute("mobile: doesn't exist")
        .then(function () {}, function (err) {
          err.cause.value.message.should.equal("Not yet implemented. " +
            "Please help us: http://appium.io/get-involved.html");
          throw err;
        }).should.be.rejectedWith(/status: 13/)
        .nodeify(done);
    });

    it('should be able to get syslog log type', function (done) {
      driver.logTypes().then(function (logTypes) {
        logTypes.should.include('syslog');
        logTypes.should.include('crashlog');
        logTypes.should.not.include('logcat');
      }).nodeify(done);
    });

    it('should be able to get syslog logs', function (done) {
      driver
        .setImplicitWaitTimeout(4000)
        .elementByName('SumLabelz')
          .should.be.rejectedWith(/status: 7/)
        .log('syslog').then(function (logs) {
          logs.length.should.be.above(0);
          logs[0].message.should.not.include("\n");
          logs[0].level.should.equal("ALL");
          logs[0].timestamp.should.exist;
        })
        .nodeify(done);
    });

    it('should be able to get crashlog logs @skip-ci', function (done) {
      var dir = path.resolve(process.env.HOME, "Library", "Logs", "DiagnosticReports");
      var msg = 'boom';
      var numBeforeLogs;
      driver
        .log('crashlog').then(function (logsBefore) {
          numBeforeLogs = logsBefore.length;
          fs.writeFileSync(dir + '/myApp_' + Date.parse(new Date()) + '_rocksauce.crash', msg);
        }).log('crashlog').then(function (logsAfter) {
          logsAfter.length.should.be.above(0);
          logsAfter.length.should.not.equal(numBeforeLogs);
          logsAfter[0].message.should.not.include("\n");
          logsAfter[0].message.should.equal(msg);
          logsAfter[0].level.should.equal("ALL");
          logsAfter[0].timestamp.should.exist;
        }).nodeify(done);
    });
  });
});
