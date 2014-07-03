"use strict";

require("./helpers/setup");

var wd = require("wd"),
    _ = require('underscore'),
    serverConfigs = require('./helpers/appium-servers');

describe("selendroid simple", function () {
  this.timeout(300000);
  var driver;
  var allPassed = true;

  before(function () {
    var serverConfig = process.env.SAUCE ?
      serverConfigs.sauce : serverConfigs.local;
    driver = wd.promiseChainRemote(serverConfig);
    require("./helpers/logging").configure(driver);

    var desired = _.clone(require("./helpers/caps").selendroid16);
    desired.app = require("./helpers/apps").androidApiDemos;
    if (process.env.SAUCE) {
      desired.name = 'selendroid - simple';
      desired.tags = ['sample'];
    }
    return driver
      .init(desired)
      .setImplicitWaitTimeout(3000);
  });

  after(function () {
    return driver
      .quit()
      .finally(function () {
        if (process.env.SAUCE) {
          return driver.sauceJobStatus(allPassed);
        }
      });
  });

  afterEach(function () {
    allPassed = allPassed && this.currentTest.state === 'passed';
  });

  it("should find elements", function () {
    return driver
      .waitForElementByName('Animation')
        .text().should.become('Animation')
      .elementByClassName('android.widget.TextView')
        .text().should.eventually.match(/Accessibility|API Demos/)
      .elementByName('App').click()
      .waitForElementByXPath('//TextView[@name=\'Action Bar\']')
      .elementsByClassName('android.widget.TextView')
        .should.eventually.have.length.above(20)
      .back()
      .sleep(3000)
      .waitForElementByName('Animation', 5000, 500)
        .text().should.become('Animation');
  });
});
