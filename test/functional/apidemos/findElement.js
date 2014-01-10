"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = ".ApiDemos"
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath,
      "android", appPkg, appAct)
  , it = require("../../helpers/driverblock.js").it;

describeWd('find elements', function(h) {

  if (process.env.FAST_TESTS) {
    afterEach(function(done) {
      // going back to main page if necessary todo: find better way
      function back() {
        return h.driver.elementByNameOrNull('Accessibility').then(function(el) {
          if (!el) return h.driver.back();
        });
      }
      back().then(back).nodeify(done);
    });
  }
  
  describe('mobile find', function() {
    it('should scroll to an element by text or content desc', function(done) {
      h.driver
        .execute("mobile: find", [["scroll",[[3, "views"]],[[7, "views"]]]]).text()
          .should.become("Views")
        .nodeify(done);
    });
    // todo: does not work in Nexus7
    it('should find a single element by content-description', function(done) {
      h.driver.execute("mobile: find", [[[[7, "Animation"]]]]).text()
          .should.become("Animation")
        .nodeify(done);
    });
    it('should find a single element by text', function(done) {
      h.driver.execute("mobile: find", [[[[3, "Animation"]]]]).text()
          .should.become("Animation")
        .nodeify(done);
    });
  });

  describe('find element(s)', function() {
    it('should find a single element by content-description', function(done) {
      h.driver
        .elementByName("Animation").text().should.become("Animation")
        .nodeify(done);
    });
    it('should find a single element by tag name', function(done) {
      h.driver
        .elementByTagName("text").text().should.become("API Demos")
        .nodeify(done);
    });
    it('should find multiple elements by tag name', function(done) {
      h.driver
        .elementsByTagName("text")
          .should.eventually.have.length.at.least(10)
        .nodeify(done);
    });
    it('should not find an element that doesnt exist', function(done) {
      h.driver
        .elementByTagName("blargimarg").should.be.rejectedWith(/status: 7/)
        .nodeify(done);
    });
    it('should not find multiple elements that doesnt exist', function(done) {
      h.driver
        .elementsByTagName("blargimarg").should.eventually.have.length(0)
        .nodeify(done);
    });
    it('should fail on empty locator', function(done) {
      h.driver.elementsByTagName("")
        .catch(function(err) {
          err.data.should.include("selector");
          throw err;
        }).should.be.rejected
        .elementsByTagName("text").should.eventually.exist
        .nodeify(done);
    });
    it('should find a single element by id', function(done) {
      h.driver
        .execute("mobile: find", [["scroll",[[3, "views"]],[[7, "views"]]]]).click()
        .elementByXPath("//text[@text='Buttons']").click()
        .elementById("buttons_1_normal").text().should.become("Normal")
        .nodeify(done);
    });
    it('should find a single element by resource-id', function(done) {
      h.driver
        .elementById('android:id/home').should.eventually.exist
        .nodeify(done);
    });
    it('should find multiple elements by resource-id', function(done) {
      h.driver
        .elementsById('android:id/text1')
          .should.eventually.have.length.at.least(10)
        .nodeify(done);
    });
  });

  describe('find element(s) from element', function() {
    it('should find a single element by tag name', function(done) {
      h.driver.elementByTagName("list").then(function(el) {
        return el
          .elementByTagName("text").text().should.become("Accessibility");
      }).nodeify(done);
    });
    it('should find multiple elements by tag name', function(done) {
      h.driver.elementByTagName("list").then(function(el) {
        return el
          .elementsByTagName("text").should.eventually.have.length.at.least(10);
      }).nodeify(done);
    });
    it('should not find an element that doesnt exist', function(done) {
      h.driver.elementByTagName("list").then(function(el) {
        return el
          .elementByTagName("blargimarg").should.be.rejectedWith(/status: 7/);
      }).nodeify(done);
    });
    it('should not find multiple elements that doesnt exist', function(done) {
      h.driver.elementByTagName("list").then(function(el) {
        return el
          .elementsByTagName("blargimarg").should.eventually.have.length(0);
      }).nodeify(done);
    });
  });

  describe('xpath', function() {
    it('should find element by type', function(done) {
      h.driver
        .elementByXPath('//text').text()
          .should.become("API Demos")
        .nodeify(done);
    });
    it('should find element by text', function(done) {
      h.driver
        .elementByXPath("//text[@value='Accessibility']").text()
          .should.become("Accessibility")
        .nodeify(done);
    });
    it('should find element by partial text', function(done) {
      h.driver
        .elementByXPath("//text[contains(@value, 'Accessibility')]").text()
          .should.become("Accessibility")
        .nodeify(done);
    });
    it('should find the last element', function(done) {
      h.driver
        .elementByXPath("//text[last()]").text()
        .then(function(text) {
          ["OS", "Text", "Views"].should.include(text);
        }).nodeify(done);
    });
    it('should find element by xpath index and child', function(done) {
      h.driver
        .elementByXPath("//frame[1]/frame[1]/list[1]/text[3]").text()
          .should.become("App")
        .nodeify(done);
    });
    it('should find element by index and embedded desc', function(done) {
      h.driver
        .elementByXPath("//frame/frame[1]//text[3]").text()
          .should.become("App")
        .nodeify(done);
    });
    it('should get an error when strategy doesnt exist', function(done) {
      h.driver
        .elementByCss('button').catch(function(err) {
          err.cause.value.message.should.equal("Invalid locator strategy: css selector");
          throw err;
        }).should.be.rejectedWith(/status: 9/)
        .nodeify(done);
    });
  });

  describe('unallowed tag names', function() {
    it('should not find secure fields', function(done) {
      h.driver
        .elementsByTagName('secure').catch(function(err) {
          err.cause.value.origValue.should.include("not supported in Android");
          throw err;
        }).should.be.rejected
        .nodeify(done);
    });
  });
});
