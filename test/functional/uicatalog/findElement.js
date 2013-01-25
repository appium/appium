/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , should = require('should');

describeWd('findElementFromElement', function(h) {
  it('should find an element within itself', function(done) {
    h.driver.elementByTagName('tableView', function(err, element) {
      should.exist(element.value);
      element.elementByTagName('tableCell', function(err, label) {
        should.exist(label.value);
        label.text(function(err, text) {
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
    h.driver.elementByTagName('tableView', function(err, element) {
      should.exist(element.value);
      element.elementsByTagName('tableCell', function(err, els) {
        els.length.should.equal(12);
        done();
      });
    });
  });
  it('should not find elements not within itself', function(done) {
    h.driver.elementByTagName('tableView', function(err, element) {
      should.exist(element.value);
      element.elementsByTagName('navigationBar', function(err, els) {
        els.length.should.equal(0);
        done();
      });
    });
  });
});
