"use strict";
var setup = require("../common/setup-base")
  , desired = require('./desired')
  , Q =  require("q");

describe('testapp - find element -', function() {
  var driver;
  setup(this, desired).then( function(d) { driver = d; } );

  it('should find a single element on the app', function(done) {
    driver.elementByTagName('button').then(function(el) {
      el.value.should.exist;
    }).nodeify(done);
  });
  it('should not find any invalid elements on the app and throw error', function(done) {
    driver
      .elementByTagName('buttonNotThere')
      .catch(function(err) {
        err['jsonwire-error'].summary.should.eql('NoSuchElement');
        throw err;
      })
      .should.be.rejectedWith(/status: 7/)
      .nodeify(done);
  });
  it('should find alerts when they exist', function(done) {
    driver
      .elementsByTagName('button').then(function(els) {
        return els[1].click();
      }).then(function() { return driver.elementByTagName('alert'); })
      .then(function(alertEl) {
        return Q.all([
          alertEl.elementByName('OK').should.eventually.exist,
          alertEl.elementByName('Cancel').should.eventually.exist
        ]);
      }).dismissAlert()
      .nodeify(done);
  });
  it('should not find alerts when they dont exist', function(done) {
    driver.elementByTagName('alert')
      .catch(function(err) {
        err['jsonwire-error'].summary.should.eql('NoSuchElement');
        throw err;
      }).should.be.rejectedWith(/status: 7/)
      .nodeify(done);
  });
  it('should get an error when strategy doesnt exist', function(done) {
    driver.elementByCss('button')
      .catch(function(err) {
        err.cause.value.message.should.equal("Invalid locator strategy: css selector");
        throw err;
      }).should.be.rejectedWith(/status: 9/)
      .nodeify(done);
  });

  it('should find all elements by tag name in the app', function(done) {
    driver
      .elementsByTagName('button').then(function(els) {
        els.length.should.equal(4);
        els[0].value.should.exist;
      }).nodeify(done);
  });
  it('should not find any elements on the app but fail gracefully', function(done) {
    driver.elementsByTagName('buttonNotThere').should.eventually.have.length(0)
      .nodeify(done);
  });

  it('should find element by valid name', function(done) {
    driver.elementByName('ComputeSumButton').should.eventually.exist
      .nodeify(done);
  });
  it('should not find element by invalid name but return respective error code', function(done) {
    driver.elementByName('InvalidNameForElement')
      .catch(function(err) {
        err['jsonwire-error'].summary.should.eql('NoSuchElement');
        throw err;
      }).should.be.rejectedWith(/status: 7/)
      .nodeify(done);
  });

  it('should find multiple elements by valid name', function(done) {
    driver.elementsByName('AppElem').should.eventually.have.length(3)
      .nodeify(done);
  });

  // it('should find an element within its parent', function(done) {
  //   driver
  //     .elementByTagName('button').should.eventually.exist
  //     .elementByTagName('UIALabel').should.eventually.exist
  //     .nodeify(done);
});
