// This requires node 0.11 and harmony

"use strict";

/* jshint esnext: true */

require("./helpers/setup");

var wd = require("yiewd"),
    _ = require('underscore'),
    serverConfigs = require('./helpers/appium-servers');

describe("ios simple", function () {
  this.timeout(300000);
  var driver;
  var allPassed = true;

  var serverConfig = process.env.SAUCE ?
    serverConfigs.sauce : serverConfigs.local;
  driver = wd.remote(serverConfig.host,serverConfig.port, 
    serverConfig.username, serverConfig.password);
  require("./helpers/logging").configure(driver);

  before(function (done) {
    driver.run(function* () {      
      var desired = _.clone(require("./helpers/caps").ios71);
      desired.app = require("./helpers/apps").iosTestApp;
      if (process.env.SAUCE) {
        desired.name = 'ios - simple';
        desired.tags = ['sample'];
      }
      yield driver.init(desired);
      done();
    });
  }); 

  after(function () {
    driver.run(function* () {
      try {
        yield driver.quit();
      } catch (ign) {
        if (process.env.SAUCE) {
          yield driver.sauceJobStatus(allPassed);
        }      
      }
    });
  });

  afterEach(function () {
    allPassed = allPassed && this.currentTest.state === 'passed';
  });

  it("should compute the sum", function (done) {
    driver.run(function* () {
      var inputFieldNames = ['IntegerA', 'IntegerB'];
      var sum = 0;
      for(var i=0; i<inputFieldNames.length; i++) {
        var inputEl = yield driver.waitForElementByName(inputFieldNames[i]);
        var x = _.random(0,10);
        sum += x;
        yield inputEl.type('' + x);
        yield driver.elementByName('Done').click();
        yield driver.sleep(1000);
      }
      var computeEl = yield driver.elementByAccessibilityId('ComputeSumButton');
      yield computeEl.click();
      yield driver.sleep(1000);
      var answerEl = driver.elementByIosUIAutomation('elements().withName("Answer");');
      var answer = yield answerEl.text();
      answer.should.equal("" + sum);
      done();
    });
  });

});
