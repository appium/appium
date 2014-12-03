"use strict";
var path = require('path')
  , setup = require("../common/setup-base");

require('../../helpers/setup-chai');

describe("appium mock api", function () {
  var mockApp = path.resolve(__dirname, 'app.xml');
  var driver;
  setup(this, {app: mockApp}).then(function (d) { driver = d; });

  describe('contexts, webviews, frames', function () {
    it('should get current context', function (done) {
      driver
        .currentContext()
          .should.eventually.become('NATIVE_APP')
        .nodeify(done);
    });
    it('should get contexts', function (done) {
      driver
        .contexts()
           .should.eventually.become(['NATIVE_APP', 'WEBVIEW_1'])
        .nodeify(done);
    });
    it('should not set context that is not there', function (done) {
      driver
        .context('WEBVIEW_FOO')
          .should.eventually.be.rejectedWith(/35/)
        .nodeify(done);
    });
    it('should set context', function (done) {
      driver
        .context('WEBVIEW_1')
        .currentContext()
          .should.eventually.become('WEBVIEW_1')
        .nodeify(done);
    });
    it('should find webview elements in a webview', function (done) {
      driver
        .elementByXPath('//*')
        .getTagName()
          .should.eventually.become('html')
        .nodeify(done);
    });
    it('should not switch to a frame that is not there', function (done) {
      driver
        .frame('foo')
        .should.eventually.be.rejectedWith(/8/)
        .nodeify(done);
    });
    it('should switch to an iframe', function (done) {
      driver
        .frame('iframe1')
        .title()
        .should.eventually.become('Test iFrame')
        .nodeify(done);
    });
    it('should switch back to default frame', function (done) {
      driver
        .frame(null)
        .title()
        .should.eventually.become('Test Webview')
        .nodeify(done);
    });
    it('should go back to native context', function (done) {
      driver
        .context('NATIVE_APP')
        .elementByXPath('//*')
        .getTagName()
          .should.eventually.become('app')
        .nodeify(done);
    });
    it('should not set a frame in a native context', function (done) {
      driver
        .frame('iframe1')
        .should.eventually.be.rejectedWith(/36/)
        .nodeify(done);
    });
  });

  describe('finding elements', function () {
    it('should find a single element by xpath', function (done) {
      driver
        .elementByXPath('//MockWebView')
        .then(function (el) {
          el.value.should.exist;
        })
        .nodeify(done);
    });
    it('should not find a single element that is not there', function (done) {
      driver
        .elementByXPath('//dontexist')
        .should.eventually.be.rejectedWith(/7/)
        .nodeify(done);
    });
    it('should find multiple elements', function (done) {
      driver
        .elementsByXPath('//MockListItem')
        .then(function (els) {
          els.should.have.length(3);
        })
        .nodeify(done);
    });
    it('should not find multiple elements that are not there', function (done) {
      driver
        .elementsByXPath('//dontexist')
        .should.eventually.eql([])
        .nodeify(done);
    });

    it('should find a single element by id', function (done) {
      driver
        .elementById('wv')
        .then(function (el) {
          el.value.should.exist;
        })
        .nodeify(done);
    });
    it('should not find a single element by id that is not there', function (done) {
      driver
        .elementById('dontexist')
        .should.eventually.be.rejectedWith(/7/)
        .nodeify(done);
    });
    it('should find multiple elements by id', function (done) {
      driver
        .elementsById('li')
        .then(function (els) {
          els.should.have.length(2);
        })
        .nodeify(done);
    });
    it('should not find multiple elements by id that are not there', function (done) {
      driver
        .elementsById('dontexist')
        .should.eventually.eql([])
        .nodeify(done);
    });

    it('should find a single element by class', function (done) {
      driver
        .elementByClassName('MockWebView')
        .then(function (el) {
          el.value.should.exist;
        })
        .nodeify(done);
    });
    it('should not find a single element by class that is not there', function (done) {
      driver
        .elementById('dontexist')
        .should.eventually.be.rejectedWith(/7/)
        .nodeify(done);
    });
    it('should find multiple elements by class', function (done) {
      driver
        .elementsByClassName('MockListItem')
        .then(function (els) {
          els.should.have.length(3);
        })
        .nodeify(done);
    });
    it('should not find multiple elements by class that are not there', function (done) {
      driver
        .elementsByClassName('dontexist')
        .should.eventually.eql([])
        .nodeify(done);
    });

    it('should not find a single element with bad strategy', function (done) {
      driver
        .elementByCss('.sorry')
        .should.eventually.be.rejectedWith(/9/)
        .nodeify(done);
    });
    it('should not find a single element with bad selector', function (done) {
      driver
        .elementByXPath('badsel')
        .should.eventually.be.rejectedWith(/32/)
        .nodeify(done);
    });
    it('should not find multiple elements with bad strategy', function (done) {
      driver
        .elementsByCss('.sorry')
        .should.eventually.be.rejectedWith(/9/)
        .nodeify(done);
    });
    it('should not find multiple elements with bad selector', function (done) {
      driver
        .elementsByXPath('badsel')
        .should.eventually.be.rejectedWith(/32/)
        .nodeify(done);
    });
  });

  describe('interacting with elements', function () {
    var el;
    it('should not send keys to an invalid element', function (done) {
      driver
        .elementByXPath('//MockListItem')
        .sendKeys("test value")
        .should.eventually.be.rejectedWith(/12/)
        .nodeify(done);
    });
    it('should send keys to an element', function (done) {
      driver
        .elementByXPath('//MockInputField')
        .then(function (_el) {
          el = _el;
          return el;
        })
        .sendKeys("test value")
        .nodeify(done);
    });
    it('should get text of an element', function (done) {
      el
        .text()
        .should.eventually.become("test value")
        .nodeify(done);
    });
    it('should not clear an invalid element', function (done) {
      driver
        .elementByXPath('//MockListItem')
        .clear()
        .should.eventually.be.rejectedWith(/12/)
        .nodeify(done);
    });
    it('should clear an element', function (done) {
      driver
        .elementByXPath('//MockInputField')
        .clear()
        .text()
        .should.eventually.become('')
        .nodeify(done);
    });
    it('should not click an invisible element', function (done) {
      driver
        .elementByXPath('//MockButton[@id="Button1"]')
        .click()
        .should.eventually.be.rejectedWith(/12/)
        .nodeify(done);
    });
    it('should click an element', function (done) {
      driver
        .elementByXPath('//MockButton[@id="Button2"]')
        .then(function (_el) { el = _el; return el; })
        .click()
        .click()
        .click()
        .nodeify(done);
    });
    it('should get the attribute of an element', function (done) {
      el
        .getAttribute('clicks')
        .should.eventually.become(3)
        .nodeify(done);
    });
    it('should get the name of an element', function (done) {
      driver
        .elementByClassName('MockInputField')
          .getTagName()
          .should.eventually.become('MockInputField')
        .elementById('wv')
          .getTagName()
          .should.eventually.become('MockWebView')
        .nodeify(done);
    });
    it('should detect whether an element is displayed', function (done) {
      driver
        .elementByXPath('//MockButton[@id="Button1"]')
        .isDisplayed()
          .should.eventually.become(false)
        .elementByXPath('//MockButton[@id="Button2"]')
        .isDisplayed()
          .should.eventually.become(true)
        .nodeify(done);
    });
    it('should detect whether an element is enabled', function (done) {
      driver
        .elementByXPath('//MockButton[@id="Button1"]')
        .isEnabled()
          .should.eventually.become(false)
        .elementByXPath('//MockButton[@id="Button2"]')
        .isEnabled()
          .should.eventually.become(true)
        .nodeify(done);
    });
    it('should detect whether an element is enabled', function (done) {
      driver
        .elementByXPath('//MockButton[@id="Button1"]')
        .isSelected()
          .should.eventually.become(false)
        .elementByXPath('//MockButton[@id="Button2"]')
        .isSelected()
          .should.eventually.become(true)
        .nodeify(done);
    });
    it('should get the location on screen of an element', function (done) {
      driver
        .elementById('nav')
        .getLocation()
        .should.eventually.eql({x: 1, y: 1})
        .nodeify(done);
    });
    it('should get the location on screen of an element with float vals', function (done) {
      driver
        .elementById('lv')
        .getLocation()
        .should.eventually.eql({x: 20.8, y: 15.3})
        .nodeify(done);
    });
    it('should get the location in view of an element', function (done) {
      driver
        .elementById('nav')
        .getLocationInView()
        .should.eventually.eql({x: 1, y: 1})
        .nodeify(done);
    });
    it('should get the location in view of an element with float vals', function (done) {
      driver
        .elementById('lv')
        .getLocationInView()
        .should.eventually.eql({x: 20.8, y: 15.3})
        .nodeify(done);
    });

    it('should get the size of an element', function (done) {
      driver
        .elementById('nav')
        .getSize()
        .should.eventually.eql({width: 100, height: 100})
        .nodeify(done);
    });
    it('should get the size of an element with float vals', function (done) {
      driver
        .elementById('wv')
        .getSize()
        .should.eventually.eql({width: 20.8, height: 20.5})
        .nodeify(done);
    });
    it('should determine element equality', function (done) {
      var el1;
      driver
        .elementById('wv')
        .then(function (el) {
          el1 = el;
          return driver;
        })
        .elementById('wv')
        .then(function (el2) {
          return el2.equals(el1);
        })
        .should.eventually.become(true)
        .nodeify(done);
    });
    it('should determine element inequality', function (done) {
      var el1;
      driver
        .elementById('wv')
        .then(function (el) {
          el1 = el;
          return driver;
        })
        .elementById('lv')
        .then(function (el2) {
          return el2.equals(el1);
        })
        .should.eventually.become(false)
        .nodeify(done);
    });
  });

  describe('generic selenium actions', function () {
    it('should not send keys without a focused element', function (done) {
      driver
        .keys("test")
        .should.eventually.be.rejectedWith(/12/)
        .nodeify(done);
    });
    it('should send keys to a focused element', function (done) {
      var el;
      driver
        .elementById('input')
        .then(function (_el) {
          el = _el;
          return el;
        })
        .click()
        .keys("test")
        .then(function () {
          return el;
        })
        .text()
        .should.eventually.become("test")
        .nodeify(done);
    });
    it('should set geolocation', function (done) {
      driver
        .setGeoLocation(-30, 30)
        .nodeify(done);
    });
    it('should get app source', function (done) {
      driver
        .source()
        .should.eventually.contain('<MockNavBar id="nav"')
        .nodeify(done);
    });
  });
});

