/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
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
      element.elementByTagName('navigationBar', function(err, label) {
        should.exist(err);
        done();
      });
    });
  });
});


describeWd('findElementsFromElement', function(h) {
  it('should find some elements within itself', function(done) {
    h.driver.elementByTagName('tableCell', function(err, element) {
      should.exist(element.value);
      element.elementsByTagName('text', function(err, els) {
        els.length.should.equal(1);
        done();
      });
    });
  });
  it('should not find elements not within itself', function(done) {
    h.driver.elementByTagName('tableCell', function(err, element) {
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
