/*global it:true */
"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = ".ApiDemos"
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath,
      "android", appPkg, appAct)
  , should = require('should');

describeWd('mobile find', function(h) {
  it('should scroll to an element by text or content desc', function(done) {
    h.driver.execute("mobile: find", [["scroll",[[3, "views"]],[[7, "views"]]]], function(err, el) {
      should.not.exist(err);
      should.exist(el);
      el.text(function(err, text) {
        should.not.exist(err);
        text.should.eql("Views");
        done();
      });
    });
  });
  it('should find a single element by content-description', function(done) {
    h.driver.execute("mobile: find", [[[[7, "Animation"]]]], function(err, el) {
      should.not.exist(err);
      should.exist(el);
      el.text(function(err, text) {
        should.not.exist(err);
        text.should.eql("Animation");
        done();
      });
    });
  });
  it('should find a single element by text', function(done) {
    h.driver.execute("mobile: find", [[[[3, "Animation"]]]], function(err, el) {
      should.not.exist(err);
      should.exist(el);
      el.text(function(err, text) {
        should.not.exist(err);
        text.should.eql("Animation");
        done();
      });
    });
  });
});

describeWd('find element(s)', function(h) {
  it('should find a single element by content-description', function(done) {
    h.driver.elementByName("Animation", function(err, el) {
      should.not.exist(err);
      should.exist(el);
      el.text(function(err, text) {
        should.not.exist(err);
        text.should.eql("Animation");
        done();
      });
    });
  });
  it('should find a single element by tag name', function(done) {
    h.driver.elementByTagName("text", function(err, el) {
      should.not.exist(err);
      should.exist(el);
      el.text(function(err, text) {
        should.not.exist(err);
        text.should.eql("API Demos");
        done();
      });
    });
  });
  it('should find multiple elements by tag name', function(done) {
    h.driver.elementsByTagName("text", function(err, els) {
      should.not.exist(err);
      els.length.should.equal(11);
      done();
    });
  });
  it('should not find an element that doesnt exist', function(done) {
    h.driver.elementByTagName("blargimarg", function(err, el) {
      should.exist(err);
      should.not.exist(el);
      err.status.should.equal(7);
      done();
    });
  });
  it('should not find multiple elements that doesnt exist', function(done) {
    h.driver.elementsByTagName("blargimarg", function(err, els) {
      should.not.exist(err);
      els.length.should.equal(0);
      done();
    });
  });
  it('should fail on empty locator', function(done) {
    h.driver.elementsByTagName("", function(err) {
      should.exist(err);
      err.data.should.include("selector");
      h.driver.elementsByTagName("text", function(err) {
        should.not.exist(err);
        done();
      });
    });
  });
  it('should find a single element by id', function(done) {
    h.driver.execute("mobile: find", [["scroll",[[3, "views"]],[[7, "views"]]]], function(err, el) {
      should.not.exist(err);
      el.click(function(err) {
        should.not.exist(err);
        h.driver.elementByXPath("//text[@text='Buttons']", function(err, but) {
          should.not.exist(err);
          but.click(function(err) {
            should.not.exist(err);
            h.driver.elementById("buttons_1_normal", function(err, el) {
              should.not.exist(err);
              el.text(function(err, text) {
                should.not.exist(err);
                text.should.eql("Normal");
                done();
              });
            });
          });
        });
      });
    });
  });
  it('should find a single element by resource-id', function(done) {
    h.driver.elementById('android:id/home', function(err, element) {
      should.not.exist(err);
      should.exist(element.value);
      done();
    });
  });
  it('should find multiple elements by resource-id', function(done) {
    h.driver.elementsById('android:id/text1', function(err, els) {
      should.not.exist(err);
      els.length.should.equal(11);
      done();
    });
  });
});

describeWd('find element(s) from element', function(h) {
  var getFirstEl = function(cb) {
    h.driver.elementByTagName("list", function(err, el) {
      should.not.exist(err);
      cb(el);
    });
  };
  it('should find a single element by tag name', function(done) {
    getFirstEl(function(el) {
      el.elementByTagName("text", function(err, el2) {
        should.not.exist(err);
        should.exist(el2);
        el2.text(function(err, text) {
          should.not.exist(err);
          text.should.eql("Accessibility");
          done();
        });
      });
    });
  });
  it('should find multiple elements by tag name', function(done) {
    getFirstEl(function(el) {
      el.elementsByTagName("text", function(err, els) {
        should.not.exist(err);
        els.length.should.equal(10);
        done();
      });
    });
  });
  it('should not find an element that doesnt exist', function(done) {
    getFirstEl(function(el) {
      el.elementByTagName("blargimarg", function(err, el2) {
        should.exist(err);
        should.not.exist(el2);
        err.status.should.equal(7);
        done();
      });
    });
  });
  it('should not find multiple elements that doesnt exist', function(done) {
    getFirstEl(function(el) {
      el.elementsByTagName("blargimarg", function(err, els) {
        should.not.exist(err);
        els.length.should.equal(0);
        done();
      });
    });
  });
});

describeWd('xpath', function(h) {
  it('should find element by type', function(done) {
    h.driver.elementByXPath('//text', function(err, el) {
      should.not.exist(err);
      el.text(function(err, text) {
        should.not.exist(err);
        text.should.eql("API Demos");
        done();
      });
    });
  });
  it('should find element by text', function(done) {
    h.driver.elementByXPath("//text[@value='Accessibility']", function(err, el) {
      should.not.exist(err);
      el.text(function(err, text) {
        should.not.exist(err);
        text.should.eql("Accessibility");
        done();
      });
    });
  });
  it('should find element by partial text', function(done) {
    h.driver.elementByXPath("//text[contains(@value, 'essibil')]", function(err, el) {
      should.not.exist(err);
      el.text(function(err, text) {
        should.not.exist(err);
        text.should.eql("Accessibility");
        done();
      });
    });
  });
  it('should find the last element', function(done) {
    h.driver.elementByXPath("//text[last()]", function(err, el) {
      should.not.exist(err);
      el.text(function(err, text) {
        should.not.exist(err);
        ["OS", "Text"].should.include(text);
        done();
      });
    });
  });
  it('should find element by xpath index and child', function(done) {
    h.driver.elementByXPath("//frame[1]/frame[1]/list[1]/text[3]", function(err, el) {
      should.not.exist(err);
      el.text(function(err, text) {
        should.not.exist(err);
        text.should.eql("App");
        done();
      });
    });
  });
  it('should find element by index and embedded desc', function(done) {
    h.driver.elementByXPath("//frame/frame[1]//text[3]", function(err, el) {
      should.not.exist(err);
      el.text(function(err, text) {
        should.not.exist(err);
        text.should.eql("App");
        done();
      });
    });
  });
});

describeWd('unallowed tag names', function(h) {
  it('should not find secure fields', function(done) {
    h.driver.elementsByTagName('secure', function(err) {
      should.exist(err);
      err.cause.value.origValue.should.include("not supported in Android");
      done();
    });
  });
});

describeWd('mobile xmlKeyContains', function(h) {
  it('should not error on xmlKeyContains', function(done) {
    h.driver.execute("mobile: xmlKeyContains", [''], function(err, el) {
      should.not.exist(err);
      done();
    });
  });
});
