/*global it:true */
"use strict";

var describeWd = require("../helpers/driverblock.js").describe
  , should = require('should');

describeWd('findElement', function(h) {
  return it('should find a single element on the app', function(done) {
    h.driver.elementByTagName('button', function(err, element) {
      should.exist(element.value);
      done();
    });
  });
});

describeWd('findElements', function(h) {
  return it('should find both elements on the app', function(done) {
    h.driver.elementsByTagName('button', function(err, elements) {
      elements.length.should.equal(2);
      should.exist(elements[0].value);
      done();
    });
  });
});

//describeWd('findElementFromElement', function(h) {
  //it('should find an element within itself', function(done) {
    //h.driver.elementByTagName('button', function(err, element) {
      //should.exist(element.value);
      //element.elementByTagName('UIALabel', function(err, label) {
        //should.exist(label.value);
        //done();
      //});
    //});
  //});
//});

