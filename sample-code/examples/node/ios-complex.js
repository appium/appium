"use strict";

require("./helpers/setup");

var wd = require("wd"),
    _ = require('underscore'),
    Q = require('q'),
    serverConfigs = require('./helpers/appium-servers'),
    _p = require('./helpers/promise-utils'),
    fs = require('fs');

describe("ios simple", function () {
  this.timeout(300000);
  var driver;
  var allPassed = true;

  before(function () {
    var serverConfig = process.env.SAUCE ?
      serverConfigs.sauce : serverConfigs.local;
    driver = wd.promiseChainRemote(serverConfig);
    require("./helpers/logging").configure(driver);

    var desired = _.clone(require("./helpers/caps").ios71);
    desired.app = require("./helpers/apps").iosUICatalogApp;
    if (process.env.SAUCE) {
      desired.name = 'ios - complex';
      desired.tags = ['sample'];
    }
    return driver.init(desired);
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

  function clickMenuItem(name) {
    return driver
      .elementByName(name)
      .catch(function () {
        return driver
          .elementByClassName('UIATableView')
          .elementsByClassName('>','UIATableCell')
          .then(_p.filterWithName(name)).first();
      }).click();
  }

  it("should print every menu item", function () {
    return driver
      .elementByClassName('UIATableView')
      .elementsByClassName('>','UIATableCell')
      .then(_p.printNames);
  });

  it("should find an element", function () {
    return driver
      // first view in UICatalog is a table
      .elementByClassName('UIATableView')
        .should.eventually.exist
      // check the number of cells/rows inside the  table
      .elementsByClassName('UIATableCell')
        .then(_p.filterDisplayed)
      .then(function (els) {
        els.should.have.length.above(6);
        return els;
      })
      // various checks
      .first().getAttribute('name')
        .should.become('Action Sheets, AAPLActionSheetViewController')
      .waitForElementByClassName('UIANavigationBar')
        .should.eventually.exist;
  });

  it("should switch context", function () {
    return clickMenuItem('Web View, AAPLWebViewController')
      // get the contexts and switch to webview
      .contexts().should.eventually.deep.equal(
        ['NATIVE_APP','WEBVIEW_1']
      ).context('WEBVIEW_1')
      // find the store link
      .sleep(1000)
      .waitForElementById('gn-apple')
        .should.eventually.exist
      // leave the webview
      .context('NATIVE_APP').sleep(1000)
      //Verify we are out of the webview
      .waitForElementByClassName('UIAScrollView')
        .should.eventually.exist
      // back to main menu
      .back();
  });

  it("should get an element location", function () {
    return driver.elementsByClassName("UIATableCell")
      .then(_p.filterDisplayed)
      .at(2)
      .getLocation()
      .then(function (loc) {
        loc.x.should.equal(0);
        loc.y.should.be.above(100);
      });
  });

  it("should take screenshots", function () {
    return driver
      // base64 screeshot
      .takeScreenshot()
        .should.eventually.exist
      // save screenshot to local file
      .then(function () {
        try {
          fs.unlinkSync('/tmp/foo.png');
        } catch (ign) {}
        fs.existsSync('/tmp/foo.png').should.not.be.ok;
      })
      .saveScreenshot('/tmp/foo.png')
      .then(function () {
        fs.existsSync('/tmp/foo.png').should.be.ok;
      });

  });

  it("should edit a text field", function () {
    var el, defaultValue;
    return clickMenuItem('Text Fields, AAPLTextFieldViewController')
      // get the field and the default/empty text
      .elementByClassName('UIATextField')
        .then(function (_el) {
          el = _el;
          return el.getValue(); })
      .then(function (val) { defaultValue = val; })
      // type something
      .then(function () {
          return el
            .sendKeys('1234 appium')
            .getValue().should.become('1234 appium')
            .elementByName('Done').click().sleep(1000); // dismissing keyboard
      })
      // clear the field
      .then(function () { return el.clear(); })
      .then(function () { el.getValue().should.become(defaultValue); })
      // back to main menu
      .back();
  });

  it("should trigger/accept/dismiss an alert", function () {
    return clickMenuItem('Alert Views, AAPLAlertViewController')
      // trigger simple alert
      .elementByName('Simple').click()
      .alertText().should.eventually.include('A Short Title Is Best')
      .dismissAlert()
      // trigger modal alert with cancel & ok buttons
      .elementByName('Okay / Cancel').click()
      .alertText().should.eventually.include('A Short Title Is Best')
      .acceptAlert()
      // back to main menu
      .back();
  });

  it("should set a slider value", function () {
    var slider;
    return clickMenuItem('Sliders, AAPLSliderViewController')
      // retrieve slider, check initial value
      .elementByClassName("UIASlider")
      .then(function (_slider) { slider = _slider; })
      .then(function () {
        return slider.getValue().should.become('42%');
      })
      // change value
      .then(function () { return slider.setImmediateValue("0%"); })
      .then(function () {
        return slider.getValue().should.become('0%');
      })
      // back to main menu
      .back();
  });

  if (!process.env.SAUCE) {
    it("should retrieve the session list", function () {
      driver.sessions()
      .then(function (sessions) {
        JSON.stringify(sessions).should.include(driver.getSessionId());
      });
    });
  }

  it("should retrieve an element size", function () {
    return Q.all([
      driver.elementByClassName('UIATableView').getSize(),
      driver.elementByClassName('UIATableCell').getSize(),
    ]).then(function (sizes) {
      sizes[0].width.should.equal(sizes[1].width);
      sizes[0].height.should.not.equal(sizes[1].height);
    });
  });

  it("should get the source", function () {
    var mainMenuSource;
    // main menu source
    return driver
      .source().then(function (source) {
        mainMenuSource = source;
        mainMenuSource.should.include('UIAStaticText');
        mainMenuSource.should.include('Text Fields');
      })
      // text fields section source
      .then(function () {
        return clickMenuItem("Text Fields, AAPLTextFieldViewController");
      }).source(function (textFieldSectionSource) {
        textFieldSectionSource.should.include('UIAStaticText');
        textFieldSectionSource.should.include('Text Fields');
        textFieldSectionSource.should.not.equal(textFieldSectionSource);
      })
      // back to main menu
      .back();
  });
});
