"use strict";

var setup = require("../../../common/setup-base")
  , desired = require("../desired");

describe("apidemo - find elements - by uiautomator", function () {

  var driver;
  setup(this, desired).then(function (d) { driver = d; });

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
