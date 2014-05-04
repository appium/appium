"use strict";

var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base")
  , desired = require("./desired")
  , androidReset = require('../../../helpers/reset').androidReset;

describe("apidemo - find elements -", function () {

  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function (done) {
      androidReset('com.example.android.apis', '.ApiDemos').nodeify(done);
    });
  }

  describe('mobile find', function () {
    it('should scroll to an element by text or content desc', function (done) {
      driver
        .execute("mobile: find", [["scroll", [[3, "views"]], [[7, "views"]]]]).text()
          .should.become("Views")
        .nodeify(done);
    });
    it('should find a single element by content-description', function (done) {
      driver.execute("mobile: find", [[[[7, "Animation"]]]]).text()
          .should.become("Animation")
        .nodeify(done);
    });
    it('should find a single element by text', function (done) {
      driver.execute("mobile: find", [[[[3, "Animation"]]]]).text()
          .should.become("Animation")
        .nodeify(done);
    });
  });

  describe('find element(s) methods', function () {
    it('should find a single element by content-description', function (done) {
      driver
        .elementByName("Animation").text().should.become("Animation")
        .nodeify(done);
    });
    it('should find a single element by tag name', function (done) {
      driver
        .elementByTagName("text").text().should.become("API Demos")
        .nodeify(done);
    });
    it('should find multiple elements by tag name', function (done) {
      driver
        .elementsByTagName("text")
          .should.eventually.have.length.at.least(10)
        .nodeify(done);
    });
    it('should find an element by class name', function (done) {
      driver
        .elementByClassName("android.widget.TextView").text().should.become("API Demos")
        .nodeify(done);
    });
    it('should find an element by class name', function (done) {
      driver
        .elementsByClassName("android.widget.TextView")
          .should.eventually.have.length.at.least(10)
        .nodeify(done);
    });
    it('should not find an element that doesnt exist', function (done) {
      driver
        .elementByTagName("blargimarg").should.be.rejectedWith(/status: 7/)
        .nodeify(done);
    });
    it('should not find multiple elements that doesnt exist', function (done) {
      driver
        .elementsByTagName("blargimarg").should.eventually.have.length(0)
        .nodeify(done);
    });
    it('should fail on empty locator', function (done) {
      driver.elementsByTagName("")
        .catch(function (err) { throw err.data; }).should.be.rejectedWith(/selector/)
        .elementsByTagName("text").should.eventually.exist
        .nodeify(done);
    });
    it('should find a single element by id', function (done) {
      driver
        .execute("mobile: find", [["scroll", [[3, "views"]], [[7, "views"]]]]).click()
        .elementByXPath("//text[@text='Buttons']").click()
        .elementById("buttons_1_normal").text().should.become("Normal")
        .nodeify(done);
    });

    it('should find a single element by resource-id', function (done) {
      driver
        .elementById('android:id/home').should.eventually.exist
        .nodeify(done);
    });
    it('should find multiple elements by resource-id', function (done) {
      driver
        .elementsById('android:id/text1')
          .should.eventually.have.length.at.least(10)
        .nodeify(done);
    });
  });

  describe('find element(s) from element', function () {
    it('should find a single element by tag name', function (done) {
      driver.elementByTagName("list").then(function (el) {
        return el
          .elementByTagName("text").text().should.become("Accessibility");
      }).nodeify(done);
    });
    it('should find multiple elements by tag name', function (done) {
      driver.elementByTagName("list").then(function (el) {
        return el
          .elementsByTagName("text").should.eventually.have.length.at.least(10);
      }).nodeify(done);
    });
    it('should not find an element that doesnt exist', function (done) {
      driver.elementByTagName("list").then(function (el) {
        return el
          .elementByTagName("blargimarg").should.be.rejectedWith(/status: 7/);
      }).nodeify(done);
    });
    it('should not find multiple elements that doesnt exist', function (done) {
      driver.elementByTagName("list").then(function (el) {
        return el
          .elementsByTagName("blargimarg").should.eventually.have.length(0);
      }).nodeify(done);
    });
  });

  describe('xpath', function () {
    it('should find element by type', function (done) {
      driver
        .elementByXPath('//text').text()
          .should.become("API Demos")
        .nodeify(done);
    });
    it('should find element by text', function (done) {
      driver
        .elementByXPath("//text[@value='Accessibility']").text()
          .should.become("Accessibility")
        .nodeify(done);
    });
    it('should find element by partial text', function (done) {
      driver
        .elementByXPath("//text[contains(@value, 'Accessibility')]").text()
          .should.become("Accessibility")
        .nodeify(done);
    });
    it('should find the last element', function (done) {
      driver
        .elementByXPath("//text[last()]").text()
        .then(function (text) {
          ["OS", "Text", "Views"].should.include(text);
        }).nodeify(done);
    });
    it('should find element by xpath index and child', function (done) {
      driver
        .elementByXPath("//frame[1]/frame[1]/list[1]/text[3]").text()
          .should.become("App")
        .nodeify(done);
    });
    it('should find element by index and embedded desc', function (done) {
      driver
        .elementByXPath("//frame/frame[1]//text[3]").text()
          .should.become("App")
        .nodeify(done);
    });
  });

  describe('real xpath', function () {
    var f = "android.widget.FrameLayout";
    var l = "android.widget.ListView";
    var t = "android.widget.TextView";
    var v = "android.view.View";
    it('should find element by type', function (done) {
      driver
        .elementByRealXPath('//' + t).text()
          .should.become("API Demos")
        .nodeify(done);
    });
    it('should find element by text', function (done) {
      driver
        .elementByRealXPath("//" + t + "[@text='Accessibility']").text()
          .should.become("Accessibility")
        .nodeify(done);
    });
    it('should find element by partial text', function (done) {
      driver
        .elementByRealXPath("//" + t + "[contains(@text, 'Accessibility')]").text()
          .should.become("Accessibility")
        .nodeify(done);
    });
    it('should find the last element', function (done) {
      driver
        .elementByRealXPath("//" + t + "[last()]").text()
        .then(function (text) {
          ["OS", "Text", "Views"].should.include(text);
        }).nodeify(done);
    });
    it('should find element by xpath index and child', function (done) {
      driver
        .elementByRealXPath("//" + f + "[1]/" + v + "[1]/" + f + "[2]/" + l + "[1]/" + t + "[3]").text()
          .should.become("App")
        .nodeify(done);
    });
    it('should find element by index and embedded desc', function (done) {
      driver
        .elementByRealXPath("//" + f + "//" + t + "[4]").text()
          .should.become("App")
        .nodeify(done);
    });
  });

  describe('find elements using accessibility id locator strategy', function () {
    it('should find an element by name', function (done) {
      driver.element('accessibility id', 'Animation').then(function (el) {
        el.should.exist;
      }).nodeify(done);
    });
    it('should return an array of one element if the plural "elements" is used', function (done) {
      driver.elements('accessibility id', 'Animation').then(function (els) {
        els.length.should.equal(1);
      }).nodeify(done);
    });
  });

  describe('find elements by -android uiautomator locator strategy', function () {
    it('should find elements with a boolean argument', function (done) {
      driver.elements('-android uiautomator', 'new UiSelector().clickable(true)').then(function (els) {
        els.length.should.be.above(11);
      }).nodeify(done);
    });
    it('should find elements without prepending "new UiSelector()"', function (done) {
      driver.elements('-android uiautomator', '.clickable(true)').then(function (els) {
        els.length.should.be.above(11);
      }).nodeify(done);
    });
    it('should find elements without prepending "new UiSelector()."', function (done) {
      driver.elements('-android uiautomator', 'clickable(true)').then(function (els) {
        els.length.should.be.above(11);
      }).nodeify(done);
    });
    it('should find elements without prepending "new "', function (done) {
      driver.elements('-android uiautomator', 'UiSelector().clickable(true)').then(function (els) {
        els.length.should.be.above(11);
      }).nodeify(done);
    });
    it('should find an element with an int argument', function (done) {
      driver.element('-android uiautomator', 'new UiSelector().index(0)').getTagName().then(function (tag) {
        tag.should.equal('android.widget.FrameLayout');
      }).nodeify(done);
    });
    it('should find an element with a string argument', function (done) {
      driver.element('-android uiautomator', 'new UiSelector().description("Animation")').then(function (el) {
        el.should.exist;
      }).nodeify(done);
    });
    it('should find an element with an overloaded method argument', function (done) {
      driver.elements('-android uiautomator', 'new UiSelector().className("android.widget.TextView")').then(function (els) {
        els.length.should.be.above(10);
      }).nodeify(done);
    });
    it('should find an element with a Class<T> method argument', function (done) {
      driver.elements('-android uiautomator', 'new UiSelector().className(android.widget.TextView)').then(function (els) {
        els.length.should.be.above(10);
      }).nodeify(done);
    });
    it('should find an element with a long chain of methods', function (done) {
      driver.element('-android uiautomator', 'new UiSelector().clickable(true).className(android.widget.TextView).index(0)').text().then(function (text) {
        text.should.equal('Accessibility');
      }).nodeify(done);
    });
    it('should find an element with recursive UiSelectors', function (done) {
      driver.elements('-android uiautomator', 'new UiSelector().childSelector(new UiSelector().clickable(true)).clickable(true)').then(function (els) {
        els.length.should.equal(2);
      }).nodeify(done);
    });
    it('should not find an element with bad syntax', function (done) {
      driver.element('-android uiautomator', 'new UiSelector().clickable((true)')
      .should.be.rejectedWith(/status: 9/)
      .nodeify(done);
    });
    it('should not find an element with a made up method', function (done) {
      driver.element('-android uiautomator', 'new UiSelector().drinkable(true)')
      .should.be.rejectedWith(/status: 9/)
      .nodeify(done);
    });
    it('should not find an element which does not exist', function (done) {
      driver.element('-android uiautomator', 'new UiSelector().description("chuckwudi")')
      .should.be.rejectedWith(/status: 7/)
      .nodeify(done);
    });
  });

  describe('unallowed tag names', function () {
    it('should not find secure fields', function (done) {
      driver
        .elementsByTagName('secure').catch(function (err) { throw JSON.stringify(err.cause.value); })
          .should.be.rejectedWith(/not supported in Android/)
        .nodeify(done);
    });
  });
  describe('invalid locator strategy', function () {
    it('should not accept -ios uiautomation locator strategy', function (done) {
      driver
        .elements('-ios uiautomation', '.elements()').catch(function (err) {
          throw JSON.stringify(err.cause.value);
        })
        .should.be.rejectedWith(/The requested resource could not be found/)
        .nodeify(done);
    });
  });
});
