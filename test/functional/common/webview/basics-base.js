"use strict";

var env = require('../../../helpers/env'),
    setup = require("../setup-base"),
    webviewHelper = require("../../../helpers/webview"),
    loadWebView = webviewHelper.loadWebView,
    isChrome = webviewHelper.isChrome,
    ChaiAsserter = require('../../../helpers/asserter.js').ChaiAsserter,
    Q = require('q'),
    spinTitle = webviewHelper.spinTitle,
    spinWait = require('../../../helpers/spin.js').spinWait,
    skip = webviewHelper.skip;

module.exports = function (desired) {

  describe('basics', function () {
    var driver;
    setup(this, desired, {'no-reset': true}).then(function (d) { driver = d; });

    beforeEach(function (done) {
      loadWebView(desired, driver).nodeify(done);
    });
    it('should find a web element in the web view', function (done) {
      driver
        .elementById('i_am_an_id').should.eventually.exist
        .nodeify(done);
    });
    it('should find multiple web elements in the web view', function (done) {
      driver
        .elementsByTagName('a').should.eventually.have.length.above(0)
        .nodeify(done);
    });
    it('should fail gracefully to find multiple missing web elements in the web view', function (done) {
      driver
        .elementsByTagName('blar').should.eventually.have.length(0)
        .nodeify(done);
    });
    it('should find element from another element', function (done) {
      driver
        .elementByClassName('border')
        .elementByXPath('>', './form').should.eventually.exist
        .nodeify(done);
    });
    it('should be able to click links', function (done) {
      driver
        .elementByLinkText('i am a link').click()
        .then(function () { return spinTitle('I am another page title', driver); })
        .nodeify(done);
    });

    it('should retrieve an element attribute', function (done) {
      driver
        .elementById('i_am_an_id')
          .getAttribute("id").should.become('i_am_an_id')
        .elementById('i_am_an_id')
          .getAttribute("blar").should.not.eventually.exist
        .nodeify(done);
    });
    it('should retrieve implicit attributes', function (done) {
      driver
        .elementsByTagName('option')
        .then(function (els) {
          els.should.have.length(3);
          return els[2].getAttribute('index').should.become('2');
        }).nodeify(done);
    });
    it('should retrieve an element text', function (done) {
      driver
        .elementById('i_am_an_id').text().should.become('I am a div')
        .nodeify(done);
    });
    it('should check if two elements are equals', function (done) {
      Q.all([
        driver.elementById('i_am_an_id'),
        driver.elementByTagName('div')
      ]).then(function (els) {
        return els[0].equals(els[1]).should.be.ok;
      }).nodeify(done);
    });
    it('should return the page source', function (done) {
      driver
        .source()
        .then(function (source) {
          source.should.include('<html');
          source.should.include('I am a page title');
          source.should.include('i appear 3 times');
          source.should.include('</html>');
        }).nodeify(done);
    });
    it('should get current url', function (done) {
      driver
        .url().should.eventually.include("test/guinea-pig")
        .nodeify(done);
    });
    it('should send keystrokes to specific element', function (done) {
      driver
        .elementById('comments')
          .clear()
          .sendKeys("hello world")
          .getValue().should.become("hello world")
        .nodeify(done);
    });
    it('should send keystrokes to active element', function (done) {
      driver
        .elementById('comments')
          .clear()
          .click()
          .keys("hello world")
        .elementById('comments')
          .getValue().should.become("hello world")
        .nodeify(done);
    });
    it('should clear element', function (done) {
      driver
        .elementById('comments')
          .sendKeys("hello world")
          .getValue().should.eventually.have.length.above(0)
        .elementById('comments')
          .clear()
          .getValue().should.become("")
        .nodeify(done);
    });
    it('should say whether an input is selected', function (done) {
      driver
        .elementById('unchecked_checkbox')
          .selected().should.not.eventually.be.ok
        .elementById('unchecked_checkbox')
          .click()
          .selected().should.eventually.be.ok
        .nodeify(done);
    });
    it('should be able to retrieve css properties', function (done) {
      driver
        .elementById('fbemail').getComputedCss('background-color')
          .should.become("rgba(255, 255, 255, 1)")
        .nodeify(done);
    });
    it('should retrieve an element size', function (done) {
      driver
        .elementById('i_am_an_id').getSize()
        .then(function (size) {
          size.width.should.be.above(0);
          size.height.should.be.above(0);
        }).nodeify(done);
    });
    it('should get location of an element', function (done) {
      driver
        .elementById('fbemail')
          .getLocation()
        .then(function (loc) {
          loc.x.should.be.above(0);
          loc.y.should.be.above(0);
        }).nodeify(done);
    });
    it('should retrieve tag name of an element', function (done) {
      driver
        .elementById('fbemail').getTagName().should.become("input")
        .elementByCss("a").getTagName().should.become("a")
        .nodeify(done);
    });

    it('should retrieve a window size @skip-chrome', function (done) {
      driver
        .getWindowSize()
        .then(
          function (size) {
            size.height.should.be.above(0);
            size.width.should.be.above(0);
          }).nodeify(done);
    });
    it('should move to an arbitrary x-y element and click on it', function (done) {
      driver.elementByLinkText('i am a link')
        .moveTo(5, 15)
        .click()
      .then(function () { return spinTitle("I am another page title", driver); })
      .nodeify(done);
    });
    it('should submit a form', function (done) {
      driver
        .elementById('comments')
          .sendKeys('This is a comment')
          .submit()
        .then(function () {
          return spinWait(function () {
            return driver
              .elementById('your_comments')
              .text()
              .should.become('Your comments: This is a comment');
          });
        }
      ).nodeify(done);
    });
    it('should return true when the element is displayed', function (done) {
      driver
        .elementByLinkText('i am a link')
          .isDisplayed().should.eventually.be.ok
        .nodeify(done);
    });
    it('should return false when the element is not displayed', function (done) {
      driver
        .elementById('invisible div')
          .isDisplayed().should.not.eventually.be.ok
        .nodeify(done);
    });
    it('should return true when the element is enabled', function (done) {
      driver
        .elementByLinkText('i am a link')
          .isEnabled().should.eventually.be.ok
        .nodeify(done);
    });
    it('should return false when the element is not enabled', function (done) {
      driver
        .execute("$('#fbemail').attr('disabled', 'disabled');")
        .elementById('fbemail').isEnabled().should.not.eventually.be.ok
        .nodeify(done);
    });
    it("should return the active element", function (done) {
      var testText = "hi there";
      driver
        .elementById('i_am_a_textbox').sendKeys(testText)
        .active().getValue().should.become(testText)
        .nodeify(done);
    });
    it('should properly navigate to anchor', function (done) {
      driver
        .url().then(function (curl) {
          return driver.get(curl);
        }).nodeify(done);
    });
    it('should be able to refresh', function (done) {
      driver.refresh()
      .nodeify(done);
    });
    it('should not display a phishing warning with safariIgnoreFraudWarning @skip-chrome', function (done) {
      var titleToBecomeRight = new ChaiAsserter(function (driver) {
        return driver
          .title()
          .should.eventually.contain("I am another page title");
      });
      driver
        .get(env.PHISHING_END_POINT + 'guinea-pig2.html')
        .waitFor(titleToBecomeRight, 10000, 500)
        .nodeify(done);
    });
    it('should be able to get performance logs', function (done) {
      if (!isChrome(desired)) return skip(
        "Performance logs aren't available except in Chrome", done);
      driver
        .logTypes()
          .should.eventually.include('performance')
        .log('performance').then(function (logs) {
          logs.length.should.be.above(0);
        }).nodeify(done);
    });
  });
};
