/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('TestApp')
  , should = require('should');

describeWd('elementByTagName', function(h) {
  it('should find a single element on the app', function(done) {
    h.driver.elementByTagName('button', function(err, element) {
      should.exist(element.value);
      done();
    });
  });
  return it('should not find any invalid elements on the app and throw error', function(done) {
    h.driver.elementByTagName('buttonNotThere', function(err, element) {
      should.not.exist(element);
      err.status.should.eql(7);
      err['jsonwire-error'].summary.should.eql('NoSuchElement');
      done();
    });
  });
});

describeWd('elementByTagName', function(h) {
  it('should find both elements on the app', function(done) {
    h.driver.elementsByTagName('button', function(err, elements) {
      elements.length.should.equal(2);
      should.exist(elements[0].value);
      done();
    });
  });
  return it('should not find any elements on the app but fail gracefully', function(done) {
    h.driver.elementsByTagName('buttonNotThere', function(err, elements) {
      should.not.exist(err);
      elements.length.should.equal(0);
      done();
    });
  });
});

describeWd('elementByName', function(h) {
  it('should find element by valid name', function(done) {
    h.driver.elementByName('ComputeSumButton', function(err, element) {
      should.exist(element.value);
      element.value.should.equal('0');
      done();
    });
  });

  return it('should not find element by invalid name but return respective error code', function(done) {
    h.driver.elementByName('InvalidNameForElement', function(err, element) {
      should.exist(err);
      err.status.should.eql(7);
      err['jsonwire-error'].summary.should.eql('NoSuchElement');
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

