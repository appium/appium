"use strict";

var setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , Q = require("q");

describe("apidemo - find elements - by uiautomator", function () {

  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should find elements with a boolean argument', function (done) {
    driver.elementsByAndroidUIAutomator('new UiSelector().clickable(true)').then(function (els) {
      els.length.should.be.above(11);
    }).nodeify(done);
  });
  it('should find elements within the context of another element', function (done) {
    driver
      .elementByClassName('android.widget.LinearLayout').then(function (el) {
        el.elementsByAndroidUIAutomator('new UiSelector().className("android.widget.TextView")')
          .then(function (els) {
            els.length.should.be.above(0);
            els.length.should.be.below(3);
        }).nodeify(done);
      });
  });
  it('should find elements without prepending "new UiSelector()"', function (done) {
    driver.elementsByAndroidUIAutomator('.clickable(true)').then(function (els) {
      els.length.should.be.above(11);
    }).nodeify(done);
  });
  it('should find elements without prepending "new UiSelector()."', function (done) {
    driver.elementsByAndroidUIAutomator('clickable(true)').then(function (els) {
      els.length.should.be.above(11);
    }).nodeify(done);
  });
  it('should find elements without prepending "new "', function (done) {
    driver.elementsByAndroidUIAutomator('UiSelector().clickable(true)').then(function (els) {
      els.length.should.be.above(11);
    }).nodeify(done);
  });
  it('should ignore trailing semicolons', function (done) {
    driver.elementsByAndroidUIAutomator('new UiSelector().clickable(true);')
    .then(function (els) {
      els.length.should.be.above(11);
    }).nodeify(done);
  });
  it('should find an element with an int argument', function (done) {
    driver.elementByAndroidUIAutomator('new UiSelector().index(0)').getTagName().then(function (tag) {
      tag.should.equal('android.widget.FrameLayout');
    }).nodeify(done);
  });
  it('should find an element with a string argument', function (done) {
    driver.elementByAndroidUIAutomator('new UiSelector().description("Animation")').then(function (el) {
      el.should.exist;
    }).nodeify(done);
  });
  it('should find an element with an overloaded method argument', function (done) {
    driver.elementsByAndroidUIAutomator('new UiSelector().className("android.widget.TextView")').then(function (els) {
      els.length.should.be.above(10);
    }).nodeify(done);
  });
  it('should find an element with a Class<T> method argument', function (done) {
    driver.elementsByAndroidUIAutomator('new UiSelector().className(android.widget.TextView)').then(function (els) {
      els.length.should.be.above(10);
    }).nodeify(done);
  });
  it('should find an element with a long chain of methods', function (done) {
    driver.elementByAndroidUIAutomator('new UiSelector().clickable(true).className(android.widget.TextView).index(0)').text().then(function (text) {
      text.should.equal('Accessibility');
    }).nodeify(done);
  });
  it('should find an element with recursive UiSelectors', function (done) {
    driver.elementsByAndroidUIAutomator('new UiSelector().childSelector(new UiSelector().clickable(true)).clickable(true)').then(function (els) {
      els.length.should.equal(1);
    }).nodeify(done);
  });
  it('should not find an element with bad syntax', function (done) {
    driver.elementByAndroidUIAutomator('new UiSelector().clickable((true)')
    .should.be.rejectedWith(/status: 9/)
    .nodeify(done);
  });
  it('should not find an element with a made up method', function (done) {
    driver.elementByAndroidUIAutomator('new UiSelector().drinkable(true)')
    .should.be.rejectedWith(/status: 9/)
    .nodeify(done);
  });
  it('should not find an element which does not exist', function (done) {
    driver.elementByAndroidUIAutomator('new UiSelector().description("chuckwudi")')
    .should.be.rejectedWith(/status: 7/)
    .nodeify(done);
  });
  it('should allow multiple selector statements and return the Union of the two sets', function (done) {
    var clickable =
      driver.elementsByAndroidUIAutomator('new UiSelector().clickable(true)')
      .then(function (els) {
        els.length.should.be.above(0);
        return els.length;
      });

    var notClickable =
      driver.elementsByAndroidUIAutomator('new UiSelector().clickable(false)')
      .then(function (els) {
        els.length.should.be.above(0);
        return els.length;
      });

    var both =
      driver.elementsByAndroidUIAutomator('new UiSelector().clickable(true); new UiSelector().clickable(false);')
      .then(function (els) {
        return els.length;
      });

    Q.all([clickable, notClickable, both]).then(function (vals) {
      var clickable = vals[0];
      var notClickable = vals[1];
      var both = vals[2];
      both.should.equal(clickable + notClickable);
    }).nodeify(done);
  });
  it('should remove duplicates when using multiple selectors', function (done) {
    var clickable = driver.elementsByAndroidUIAutomator('new UiSelector().clickable(true)').then(function (els) {
      els.length.should.be.above(0);
      return els.length;
    }).fail(console.log);

    var clickableClickable = driver.elementsByAndroidUIAutomator('new UiSelector().clickable(true); new UiSelector().clickable(true);').then(function (els) {
      els.length.should.be.above(0);
      return els.length;
    }).fail(console.log);

    Q.all([clickable, clickableClickable]).then(function (vals) {
      vals[0].should.equal(vals[1]);
    }).nodeify(done);
  });
  it('should find an element in the second selector if the first finds no elements', function (done) {
    driver.elementByAndroidUIAutomator('new UiSelector().className("not.a.class"); new UiSelector().className("android.widget.TextView")')
    .then(function (el) {
      el.should.exist;
    }).nodeify(done);
  });
  it('should scroll to, and return elements using UiScrollable', function (done) {
    driver.elementByAndroidUIAutomator('new UiScrollable(new UiSelector().scrollable(true).instance(0)).getChildByText(new UiSelector().className("android.widget.TextView"), "Views")')
    .text()
    .then(function (text) {
      text.should.equal("Views");
    }).nodeify(done);
  });
  it('should allow chaining UiScrollable methods', function (done) {
    driver.elementByAndroidUIAutomator('new UiScrollable(new UiSelector().scrollable(true).instance(0)).setMaxSearchSwipes(10).getChildByText(new UiSelector().className("android.widget.TextView"), "Views")')
    .text()
    .then(function (text) {
      text.should.equal("Views");
    }).nodeify(done);
  });
  it('should error reasonably if a UiScrollable does not return a UiObject', function (done) {
    driver.elementByAndroidUIAutomator('new UiScrollable(new UiSelector().scrollable(true).instance(0)).setMaxSearchSwipes(10)')
    .should.be.rejectedWith(/status: 9/)
    .nodeify(done);
  });
});
