"use strict";

var setup = require("../../../common/setup-base")
  , desired = require('../desired')
  , fs = require('fs')
  , path = require('path')
  , _ = require('underscore');

describe('testapp - basics - calc app 2', function () {
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
    driver
      .elementByName('Answer')
      .then(function (sumLabel) {
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

  // TODO: Fails on sauce, investigate
  it('should be able to get syslog logs @skip-ios6 @skip-ios8 @skip-ci', function (done) {
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
    driver
      .log('crashlog').then(function (/* logs */) {
        fs.writeFileSync(dir + '/myApp_' + Date.parse(new Date()) + '_rocksauce.crash', msg);
      })
      .log('crashlog').then(function (logs) {
        logs.length.should.equal(1);
        _.last(logs).message.should.not.include("\n");
        _.last(logs).message.should.equal(msg);
        _.last(logs).level.should.equal("ALL");
        _.last(logs).timestamp.should.exist;
      })
      .log('crashlog').then(function (logs) {
        logs.length.should.equal(0);
      })
      .nodeify(done);
  });
});
