/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , should = require('should')
  , _s = require('underscore.string')
  , assert = require('assert');

describeWd('flick gesture', function(h) {
  it('should work via webdriver method', function(done) {
    h.driver.elementByTagName('tableCell', function(err, element) {
      element.getLocation(function(err, location) {
        h.driver.flick(0, -100, false, function(err) {
          should.not.exist(err);
          element.getLocation(function(err, location2) {
            assert.equal(location.x, location.x);
            assert.notEqual(location.y, location2.y);
            done();
          });
        });
      });
    });
  });
  it('should work via mobile only method', function(done) {
    h.driver.elementByTagName('tableCell', function(err, element) {
      element.getLocation(function(err, location) {
        h.driver.execute("mobile: flick", [{endX: 0, endY: 0}], function(err) {
          should.not.exist(err);
          element.getLocation(function(err, location2) {
            assert.equal(location.x, location.x);
            assert.notEqual(location.y, location2.y);
            done();
          });
        });
      });
    });
  });
  it('should work via mobile only method with percentage', function(done) {
    h.driver.elementByTagName('tableCell', function(err, element) {
      element.getLocation(function(err, location) {
        var opts = {startX: 0.75, startY: 0.75, endX: 0.25, endY: 0.25};
        h.driver.execute("mobile: flick", [opts], function(err) {
          should.not.exist(err);
          element.getLocation(function(err, location2) {
            assert.equal(location.x, location.x);
            assert.notEqual(location.y, location2.y);
            done();
          });
        });
      });
    });
  });
});

describeWd('swipe gesture', function(h) {
  it('should work with wd function in pixels', function(done) {
    h.driver.elementByTagName('tableCell', function(err, element) {
      element.getLocation(function(err, location) {
        h.driver.flick(0, -40, true, function(err) {
          should.not.exist(err);
          element.getLocation(function(err, location2) {
            assert.equal(location.x, location.x);
            assert.notEqual(location.y, location2.y);
            done();
          });
        });
      });
    });
  });
  it('should work with wd function in percentage units', function(done) {
    h.driver.elementByTagName('tableCell', function(err, element) {
      element.getLocation(function(err, location) {
        h.driver.flick(0, -0.15, true, function(err) {
          should.not.exist(err);
          element.getLocation(function(err, location2) {
            assert.equal(location.x, location.x);
            assert.notEqual(location.y, location2.y);
            done();
          });
        });
      });
    });
  });
  it('should work with mobile function in pixels', function(done) {
    h.driver.elementByTagName('tableCell', function(err, element) {
      element.getLocation(function(err, location) {
        var opts = {startX: 50, startY: 400, endX: 50, endY: 300, duration: 2};
        h.driver.execute("mobile: swipe", [opts], function(err) {
          should.not.exist(err);
          element.getLocation(function(err, location2) {
            assert.equal(location.x, location.x);
            assert.notEqual(location.y, location2.y);
            done();
          });
        });
      });
    });
  });
  it('should work with mobile function in percent', function(done) {
    h.driver.elementByTagName('tableCell', function(err, element) {
      element.getLocation(function(err, location) {
        var opts = {startX: 0.5, startY: 0.9, endX: 0.5, endY: 0.7, duration: 2};
        h.driver.execute("mobile: swipe", [opts], function(err) {
          should.not.exist(err);
          element.getLocation(function(err, location2) {
            assert.equal(location.x, location.x);
            assert.notEqual(location.y, location2.y);
            done();
          });
        });
      });
    });
  });
});

describeWd("flick element", function(h) {
  it("slider value should change", function(done) {
    h.driver.elementsByTagName("tableCell", function(err, elements) {
      elements[1].click(function(){
        h.driver.elementByTagName("slider", function(err, element) {
          element.getAttribute("value", function(err, valueBefore) {
            element.flick(-0.5, 0, 1, function() {
              element.getAttribute("value", function(err, valueAfter) {
                assert.equal(valueBefore, "50%");
                assert.equal(valueAfter, "0%");
                done();
              });
            });
          });
        });
      });
    });
  });
  it("should work with mobile flick", function(done) {
    h.driver.elementsByTagName("tableCell", function(err, elements) {
      elements[1].click(function(){
        h.driver.elementByTagName("slider", function(err, element) {
          element.getAttribute("value", function(err, valueBefore) {
            var opts = {element: element.value, endX: -50, endY: 0};
            h.driver.execute("mobile: flick", [opts], function() {
              element.getAttribute("value", function(err, valueAfter) {
                assert.equal(valueBefore, "50%");
                assert.equal(valueAfter, "0%");
                done();
              });
            });
          });
        });
      });
    });
  });
  it("should work with mobile flick and percent", function(done) {
    h.driver.elementsByTagName("tableCell", function(err, elements) {
      elements[1].click(function(){
        h.driver.elementByTagName("slider", function(err, element) {
          element.getAttribute("value", function(err, valueBefore) {
            var opts = {element: element.value, startX: 0.5, startY: 0.0,
              endX: 0.0, endY: 0.0};
            h.driver.execute("mobile: flick", [opts], function() {
              element.getAttribute("value", function(err, valueAfter) {
                assert.equal(valueBefore, "50%");
                assert.equal(valueAfter, "0%");
                done();
              });
            });
          });
        });
      });
    });
  });
});
describeWd("swipe element", function(h) {
  it("slider value should change", function(done) {
    h.driver.elementsByTagName("tableCell", function(err, elements) {
      elements[1].click(function(){
        h.driver.elementByTagName("slider", function(err, element) {
          element.getAttribute("value", function(err, valueBefore) {
            var opts = {startX: 0.5, startY: 0.5, endX: 0.25, endY: 0.5,
              duration: 0.3, element: element.value};
            h.driver.execute("mobile: swipe", [opts], function() {
              element.getAttribute("value", function(err, valueAfter) {
                assert.equal(valueBefore, "50%");
                assert.equal(valueAfter, "20%");
                done();
              });
            });
          });
        });
      });
    });
  });
  it("slider value should change by pixels", function(done) {
    h.driver.elementsByTagName("tableCell", function(err, elements) {
      elements[1].click(function(){
        h.driver.elementByTagName("slider", function(err, element) {
          element.getAttribute("value", function(err, valueBefore) {
            var opts = {endX: 15, endY: 10, duration: 0.3, element: element.value};
            h.driver.execute("mobile: swipe", [opts], function() {
              element.getAttribute("value", function(err, valueAfter) {
                assert.equal(valueBefore, "50%");
                assert.equal(valueAfter, "5%");
                done();
              });
            });
          });
        });
      });
    });
  });
});
describeWd('complex tap', function(h) {
  it('should work with custom options', function(done) {
    var tapOpts = {
      tapCount: 1 // how many taps
      , duration: 2.3 // how long
      , touchCount: 3 // how many fingers
      , x: 100 // in pixels from left
      , y: 250 // in pixels from top
    };
    h.driver.execute("mobile: tap", [tapOpts], function(err) {
      should.not.exist(err);
      h.driver.elementByTagName("textview", function(err, el) {
        should.not.exist(err);
        el.text(function(err, text) {
          should.not.exist(err);
          _s.trim(text).should.eql("Now is the time for all good developers to come to serve their country.\n\nNow is the time for all good developers to come to serve their country.");
          done();
        });
      });
    });
  });
  it('should work in relative units', function(done) {
    var tapOpts = {
      tapCount: 1 // how many taps
      , duration: 2.3 // how long
      , touchCount: 3 // how many fingers
      , x: 0.5 // 50% from left of screen
      , y: 0.55 // 55% from top of screen
    };
    h.driver.execute("mobile: tap", [tapOpts], function(err) {
      should.not.exist(err);
      h.driver.elementByTagName("textview", function(err, el) {
        should.not.exist(err);
        el.text(function(err, text) {
          should.not.exist(err);
          _s.trim(text).should.eql("Now is the time for all good developers to come to serve their country.\n\nNow is the time for all good developers to come to serve their country.");
          done();
        });
      });
    });
  });
  it('should work with default options', function(done) {
    h.driver.execute("mobile: tap", function(err) {
      should.not.exist(err);
      h.driver.elementByTagName("textview", function(err, el) {
        should.not.exist(err);
        el.text(function(err, text) {
          should.not.exist(err);
          _s.trim(text).should.eql("Now is the time for all good developers to come to serve their country.\n\nNow is the time for all good developers to come to serve their country.");
          done();
        });
      });
    });
  });
});
describeWd('complex tap on element', function(h) {
  it('should work in relative units', function(done) {
    h.driver.elementsByTagName('tableCell', function(err, els) {
      should.not.exist(err);
      var el = els[4];
      var tapOpts = {
        x: 0.5 // in relative width from left
        , y: 0.5 // in relative height from top
        , element: el.value
      };
      h.driver.execute("mobile: tap", [tapOpts], function(err) {
        should.not.exist(err);
        h.driver.elementByTagName("textview", function(err, el) {
          should.not.exist(err);
          el.text(function(err, text) {
            should.not.exist(err);
            _s.trim(text).should.eql("Now is the time for all good developers to come to serve their country.\n\nNow is the time for all good developers to come to serve their country.");
            done();
          });
        });
      });
    });
  });
  it('should work in pixels', function(done) {
    h.driver.elementsByTagName('tableCell', function(err, els) {
      should.not.exist(err);
      var el = els[4];
      var tapOpts = {
        x: 150 // in pixels from left
        , y: 30 // in pixels from top
        , element: el.value
      };
      h.driver.execute("mobile: tap", [tapOpts], function(err) {
        should.not.exist(err);
        h.driver.elementByTagName("textview", function(err, el) {
          should.not.exist(err);
          el.text(function(err, text) {
            should.not.exist(err);
            _s.trim(text).should.eql("Now is the time for all good developers to come to serve their country.\n\nNow is the time for all good developers to come to serve their country.");
            done();
          });
        });
      });
    });
  });
});
// quarantine this since it's not actually breaking right now
//describeWd('gestures', function(h) {
  //it('should break on weird table cell behavior', function(done) {
    //h.driver.elementByXPath('tableCell/text', function(err, el) {
      //should.not.exist(err);
      //el.click(function(err) {
        //setTimeout(done, 3000);
      //});
    //});
  //});
//});
