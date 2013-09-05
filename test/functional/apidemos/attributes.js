/*global it:true */
"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = ".ApiDemos"
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath,
      "android", appPkg, appAct)
  , should = require('should');

describeWd('get attribute', function(h) {
  it('should be able to find text attribute', function(done) {
    h.driver.elementByName('Animation', function(err, el) {
      should.not.exist(err);
      el.getAttribute('text', function(err, text) {
        should.not.exist(err);
        text.should.equal("Animation");
        done();
      });
    });
  });
  it('should be able to find name attribute', function(done) {
    h.driver.elementByName('Animation', function(err, el) {
      should.not.exist(err);
      el.getAttribute('name', function(err, text) {
        should.not.exist(err);
        text.should.equal("Animation");
        done();
      });
    });
  });
  it('should be able to find name attribute, falling back to text', function(done) {
    h.driver.elementByName('Animation', function(err, el) {
      should.not.exist(err);
      el.click(function(err) {
        should.not.exist(err);
        h.driver.elementsByTagName('text', function(err, els) {
          should.not.exist(err);
          els[1].getAttribute('name', function(err, text) {
            should.not.exist(err);
            text.should.equal("Bouncing Balls");
            done();
          });
        });
      });
    });
  });
  it('should be able to find displayed attribute', function(done) {
    h.driver.elementByName('Animation', function(err, el) {
      should.not.exist(err);
      el.getAttribute('displayed', function(err, val) {
        should.not.exist(err);
        val.should.equal('true');
        done();
      });
    });
  });
  it('should be able to find displayed attribute through normal func', function(done) {
    h.driver.elementByName('Animation', function(err, el) {
      should.not.exist(err);
      el.displayed(function(err, val) {
        should.not.exist(err);
        val.should.equal(true);
        done();
      });
    });
  });
  it('should be able to get element location', function(done) {
    h.driver.elementByName('Animation', function(err, el) {
      should.not.exist(err);
      el.getLocation(function(err, loc) {
        should.not.exist(err);
        [0].should.include(loc.x);
        [183].should.include(loc.y);
        done();
      });
    });
  });
  it('should be able to get element size', function(done) {
    h.driver.elementByName('Animation', function(err, el) {
      should.not.exist(err);
      el.getSize(function(err, size) {
        should.not.exist(err);
        should.exist(size.width);
        should.exist(size.height);
        done();
      });
    });
  });
  // TODO: tests for checkable, checked, clickable, focusable, focused,
  // longClickable, scrollable, selected
});

describeWd('get attribute selected', function(h) {
  it('should be able to get selected value of a tab', function(done) {
    h.driver.execute("mobile: find", [["scroll",[[3, "views"]],[[7, "views"]]]], function(err, el) {
      should.not.exist(err);
      el.click(function(err) {
        h.driver.execute("mobile: find", [["scroll",[[3, "tabs"]],[[7, "tabs"]]]], function(err, el) {
          should.not.exist(err);
          el.click(function(err) {
            h.driver.execute("mobile: find", [["scroll",[[3, "content by id"]],[[7, "content by id"]]]], function(err, el) {
              should.not.exist(err);
              el.click(function(err) {
                h.driver.elementsByTagName("text", function(err,els) {
                  should.not.exist(err);
                  els[0].getAttribute('selected', function(err, selected) {
                    should.not.exist(err);
                    selected.should.equal('false'); // the 1st text is not selected
                    els[1].getAttribute('selected', function(err, selected) {
                      should.not.exist(err);
                      selected.should.equal('true'); // tab 1 is selected
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
