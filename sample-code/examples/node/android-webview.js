"use strict";

require("./helpers/setup");

var wd = require("wd"),
    _ = require('underscore'),
    serverConfigs = require('./helpers/appium-servers');

describe("android webview", function () {
  this.timeout(300000);
  var driver;
  var allPassed = true;

  before(function () {
    var serverConfig = process.env.SAUCE ?
      serverConfigs.sauce : serverConfigs.local;
    driver = wd.promiseChainRemote(serverConfig);
    require("./helpers/logging").configure(driver);

    var desired = process.env.SAUCE ?
      _.clone(require("./helpers/caps").android18) :
      _.clone(require("./helpers/caps").android19);
    desired.app = require("./helpers/apps").selendroidTestApp;
    if (process.env.SAUCE) {
      desired.name = 'android - webview';
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

  it("should switch to webview", function () {
    return driver
      .elementByName('buttonStartWebviewCD')
        .click()
      .sleep(5000)
      .contexts()
      .then(function (ctxs) {
        console.log(ctxs);
        return driver.context(ctxs[ctxs.length - 1]);
      })
      .elementById('name_input')
        .clear()
        .sendKeys('Appium User')
        .sendKeys(wd.SPECIAL_KEYS.Return)
      .sleep(1000)
      .source().then(function (source) {
        source.should.include('This is my way of saying hello');
        source.should.include('Appium User');
      });
  });
});
