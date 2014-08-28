"use strict";
var setup = require("../../common/setup-base")
  , desired = require('./desired');

describe('testapp - find element', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  describe('by id', function () {
    it('should first attempt to match accessibility id', function (done) {
      driver.elementById('ComputeSumButton').then(function (el) {
        return el.getAttribute('label').should.eventually.equal('Compute Sum');
      }).nodeify(done);
    });

    it('should attempt to match by string if no accessibility id matches', function (done) {
      driver.elementById('Compute Sum').then(function (el) {
        return el.getAttribute('label').should.eventually.equal('Compute Sum');
      }).nodeify(done);
    });

    it('should use a localized string if the id is a localization key', function (done) {
      driver.elementById('main.button.computeSum').then(function (el) {
        return el.getAttribute('label').should.eventually.equal('Compute Sum');
      }).nodeify(done);
    });

    it('should be able to return multiple matches', function (done) {
      driver.elementsById('TextField').then(function (els) {
        els.length.should.be.greaterThan(1);
      }).nodeify(done);
    });
  });

  it('should find a single element on the app', function (done) {
    driver.elementByClassName('UIAButton').then(function (el) {
      el.value.should.exist;
    }).nodeify(done);
  });

  it('should not find any invalid elements on the app and throw error', function (done) {
    driver
      .elementByClassName('UIAButtonNotThere')
      .catch(function (err) {
        err['jsonwire-error'].summary.should.eql('NoSuchElement');
        throw err;
      })
      .should.be.rejectedWith(/status: 7/)
      .nodeify(done);
  });

  it('should find alerts when they exist', function (done) {
    var alert = null;
    driver
      .elementsByClassName('UIAButton').then(function (els) {
        return els[1].click();
      }).then(function () { return driver.elementByClassName('UIAAlert'); })
      .then(function (alertEl) {
        alert = alertEl;
        return alert.elementByName('OK').should.eventually.exist;
      }).then(function () {
        return alert.elementByName('Cancel').should.eventually.exist;
      })
      .dismissAlert()
      .nodeify(done);
  });

  it('should not find alerts when they dont exist', function (done) {
    driver.elementByClassName('UIAAlert')
      .catch(function (err) {
        err['jsonwire-error'].summary.should.eql('NoSuchElement');
        throw err;
      }).should.be.rejectedWith(/status: 7/)
      .nodeify(done);
  });

  it('should get an error when strategy doesnt exist', function (done) {
    driver.elementByCss('UIAButton')
      .catch(function (err) {
        err.cause.value.message.should.equal("Invalid locator strategy: css selector");
        throw err;
      }).should.be.rejectedWith(/status: 9/)
      .nodeify(done);
  });

  it('should find all elements by class name in the app', function (done) {
    driver
      .elementsByClassName('UIAButton').then(function (els) {
        [4, 7].should.contain(els.length);
        els[0].value.should.exist;
      }).nodeify(done);
  });

  it('should not find any elements on the app but fail gracefully', function (done) {
    driver.elementsByClassName('UIAButtonNotThere').should.eventually.have.length(0)
      .nodeify(done);
  });

  it('should find element by valid name', function (done) {
    driver.elementByName('ComputeSumButton').should.eventually.exist
      .nodeify(done);
  });

  it('should not find element by invalid name but return respective error code', function (done) {
    driver.elementByName('InvalidNameForElement')
      .catch(function (err) {
        err['jsonwire-error'].summary.should.eql('NoSuchElement');
        throw err;
      }).should.be.rejectedWith(/status: 7/)
      .nodeify(done);
  });

  it('should find an element with accessibility id containing an apostrophe', function (done) {
    driver.element('accessibility id', "Access'ibility").then(function (el) {
      el.should.exist;
    }).nodeify(done);
  });

  it('should not find element by incomplete class name but return respective error code', function (done) {
    driver.elementsByClassName('notAValidReference')
      .catch(function (err) {
        err['jsonwire-error'].summary.should.eql('UnknownError');
        throw err;
      }).should.be.rejectedWith(/status: 13/)
      .nodeify(done);
  });

  it('should find multiple elements by valid name', function (done) {
    driver.elementsByName('AppElem').should.eventually.have.length(3)
      .nodeify(done);
  });

  it('should find an element within its parent', function (done) {
    // there are 2 textfields with the same name imbricated.
    driver
      .elementById('TextField2').then(function (parent) {
        parent.should.exist;
        return parent.elementById('TextField2').should.eventually.exist;
      })
      .nodeify(done);
  });
});
