/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , _ = require("underscore")
  , spinWait = require("../../helpers/spin.js").spinWait
  , should = require('should');

describeWd('findElementFromElement', function(h) {
  it('should find an element within itself', function(done) {
    h.driver.elementByTagName('tableView', function(err, element) {
      should.exist(element.value);
      element.elementByTagName('text', function(err, staticText) {
        should.exist(staticText.value);
        staticText.text(function(err, text) {
          text.should.equal("Buttons, Various uses of UIButton");
          done();
        });
      });
    });
  });
  it('should not find an element not within itself', function(done) {
    h.driver.elementByTagName('tableView', function(err, element) {
      should.exist(element.value);
      element.elementByTagName('navigationBar', function(err) {
        should.exist(err);
        done();
      });
    });
  });
});


describeWd('findElementsFromElement', function(h) {
  it('should find some elements within itself', function(done) {
    h.driver.elementByTagName('tableCell', function(err, element) {
      should.not.exist(err);
      should.exist(element.value);
      element.elementsByTagName('text', function(err, els) {
        els.length.should.equal(1);
        done();
      });
    });
  });
  it('should not find elements not within itself', function(done) {
    h.driver.elementByTagName('tableCell', function(err, element) {
      should.not.exist(err);
      should.exist(element.value);
      element.elementsByTagName('navigationBar', function(err, els) {
        els.length.should.equal(0);
        done();
      });
    });
  });
});


describeWd('findElementsByTagName', function(h) {
  it('should return all image elements with internally generated ids', function(done) {
    h.driver.elementsByTagName('image', function(err, elements) {
      for (var i=0; i < elements.length; i++) {
        var num = parseInt(elements[i].value, 10);
        should.exist(num);
      }
      done();
    });
  });
});

var setupXpath = function(d, cb) {
  d.elementsByTagName('tableCell', function(err, els) {
    els[0].click(cb);
  });
};

describeWd('findElement(s)ByXpath', function(h) {
  it('should return a single element', function(done) {
    setupXpath(h.driver, function() {
      h.driver.elementByXPath("//button", function(err, el) {
        should.not.exist(err);
        el.text(function(err, text) {
          should.not.exist(err);
          text.should.equal("Back");
          done();
        });
      });
    });
  });
  it('should return multiple elements', function(done) {
    setupXpath(h.driver, function() {
      h.driver.elementsByXPath("//button", function(err, els) {
        should.not.exist(err);
        els.length.should.be.above(5);
        done();
      });
    });
  });
  it('should filter by name', function(done) {
    setupXpath(h.driver, function() {
      h.driver.elementByXPath("button[@name='Rounded']", function(err, el) {
        should.not.exist(err);
        el.text(function(err, text) {
          should.not.exist(err);
          text.should.equal("Rounded");
          done();
        });
      });
    });
  });
  it('should know how to restrict root-level elements', function(done) {
    setupXpath(h.driver, function() {
      h.driver.elementByXPath("/button", function(err) {
        should.exist(err);
        err.status.should.equal(7);
        done();
      });
    });
  });
  it('should search an extended path by child', function(done) {
    setupXpath(h.driver, function() {
      var spinFn = function(spinCb) {
        h.driver.elementsByXPath("navigationBar/text", function(err, els) {
          should.not.exist(err);
          els[0].text(function(err, text) {
            try {
              text.should.equal('Buttons');
              spinCb();
            } catch (e) {
              spinCb(e);
            }
          });
        });
      };
      spinWait(spinFn, function() {
        done();
      });
    });
  });
  it('should search an extended path by descendant', function(done) {
    setupXpath(h.driver, function() {
      h.driver.elementsByXPath("cell//button", function(err, els) {
        should.not.exist(err);
        var texts = [];
        _.each(els, function(el) {
          el.text(function(err, text) {
            texts.push(text);
            if (texts.length === els.length) {
              var hasNavButton = _.contains(texts, "Button");
              hasNavButton.should.equal(false);
              _.contains(texts, "Gray").should.equal(true);
              done();
            }
          });
        });
      });
    });
  });
  it('should filter by partial text', function(done) {
    setupXpath(h.driver, function() {
      h.driver.elementByXPath("cell//button[contains(@name, 'Gr')]", function(err, el) {
        should.not.exist(err);
        el.text(function(err, text) {
          text.should.equal("Gray");
          done();
        });
      });
    });
  });
});
