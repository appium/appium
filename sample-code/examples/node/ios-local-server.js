"use strict";

require("./helpers/setup");

var wd = require("wd"),
    _ = require('underscore'),
    serverConfigs = require('./helpers/appium-servers'),
    localServer = require('./helpers/local-server');

describe("ios local server", function () {
  this.timeout(300000);
  var driver;
  var allPassed = true;

  before(function () {
    localServer.start();
    var serverConfig = process.env.SAUCE ?
      serverConfigs.sauce : serverConfigs.local;
    driver = wd.promiseChainRemote(serverConfig);
    require("./helpers/logging").configure(driver);

    var desired = _.clone(require("./helpers/caps").ios71);
    desired.app = require("./helpers/apps").iosWebviewAppLocal;
    if (process.env.SAUCE) {
      desired.name = 'ios - local server';
      desired.tags = ['sample'];
    }
    return driver.init(desired);
  });

  after(function () {
    localServer.stop();
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


  it("should get the url", function () {
    return driver
      .elementByXPath('//UIATextField[@value=\'Enter URL\']')
        .sendKeys('http://localhost:3000/index.html')
      .elementByName('Go').click()
      .elementByClassName('UIAWebView').click() // dismissing keyboard
      .context('WEBVIEW')
      .sleep(3000)
      .waitForElementById('wow')
        .text().should.eventually.include('so cool');
  });

});
