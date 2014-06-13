"use strict";

var setup = require("../../common/setup-base")
  , desired = require('./desired')
  , _ = require('underscore');

describe('uicatalog - find - basics @skip-ios6', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should find a single element by id @skip-ios7', function (done) {
    // ById is not avalable in ios7
    driver
      .elementById('Date Picker')
        .should.eventually.exist
      .nodeify(done);
  });

  it('should find a single element by id wrapped in array for multi @skip-ios7', function (done) {
    // ById is not avalable in ios7
    driver
      .elementsById('Date Picker')
      .then(function (els) {
        els.length.should.equal(1);
      })
      .nodeify(done);
  });

  it('should find a single element using elementByName @skip-ios7', function (done) {
    driver
      .elementByName('Image View, AAPLImageViewController')
      .then(function (el) {
        el.should.exist;
      }).nodeify(done);
  });
  it('should find an element within descendants  @skip-ios7', function (done) {
    driver
      .elementByXPath("//UIATableCell[@name = 'Buttons, AAPLButtonViewController']")
      .then(function (el) {
        el.should.exist;
        return el.elementByClassName('UIAStaticText').getAttribute('name')
          .should.become("Buttons, AAPLButtonViewController");
      }).nodeify(done);
  });

  it('should not find an element not within itself', function (done) {
    driver
      .elementByXPath("//UIATableCell[@name = 'Buttons, AAPLButtonViewController']")
      .then(function (el) {
        el.should.exist;
        return el.elementByClassName('UIANavigationBar')
          .should.be.rejectedWith(/status: 7/);
      }).nodeify(done);
  });

  it('should find some elements within itself', function (done) {
    driver
      .elementByXPath("//UIATableCell[@name = 'Buttons, AAPLButtonViewController']")
      .then(function (el) {
        el.should.exist;
        return el.elementsByClassName('UIAStaticText')
          .should.eventually.have.length(1);
      }).nodeify(done);
  });

  it('should not find elements not within itself', function (done) {
    driver
      .elementByXPath("//UIATableCell[@name = 'Buttons, AAPLButtonViewController']")
      .then(function (el) {
        el.should.exist;
        el.elementsByClassName('UIANavigationBar')
          .should.eventually.have.length(0);
      }).nodeify(done);
  });

  describe('no mix up', function () {
    after(function (done) {
      driver.clickButton('UICatalog')
      .nodeify(done);
    });

    it('should not allow found elements to be mixed up', function (done) {
      var el1, el2, el1Name, el2Name;
      driver
        .elementByClassName('UIATableCell')
        .then(function (el) {
          el1 = el;
          return el1.getAttribute('name').then(function (name) {
            el1Name = name;
          });
        })
        .elementByClassName('UIATableCell')
          .click()
        .delay(1000)
        .elementByClassName('UIATableCell')
        .then(function (el) {
          el2 = el;
          el2.value.should.not.equal(el1.value);
          return el2.getAttribute('name').then(function (name) {
            el2Name = name;
          });
        }).then(function () {
          el1.value.should.not.equal(el2.value);
          el1Name.should.not.equal(el2Name);
          // el1 is gone, so it doesn't have a name anymore
          return el1.getAttribute('name')
            .should.eventually.equal("");
        })
        .nodeify(done);
    });
  });

  it('should return all image elements with internally generated ids', function (done) {
    driver.elementsByClassName('UIAImage').then(function (els) {
      els.length.should.be.above(0);
      _(els).each(function (el) {
        el.should.exist;
      });
    }).nodeify(done);
  });

  describe('findElementsByClassName textfield case', function () {
    after(function (done) {
      driver.clickButton('UICatalog')
      .nodeify(done);
    });
    it('should find only one textfield', function (done) {
      driver
        .elementByXPath("//UIAStaticText[contains(@label,'Action Sheets')]").click()
        .elementByName('Okay / Cancel')
        .elementsByClassName('>', 'UIAStaticText')
          .should.eventually.have.length(1)
        .nodeify(done);
    });
  });

  describe('findElement(s) containing name', function () {
    after(function (done) {
      driver.clickBack()
      .nodeify(done);
    });

    it('should find one element', function (done) {
      driver
        .elementByXPath("//UIAStaticText[contains(@label,'Action Sheets')]").click()
        .elementByName('*Okay*').getAttribute('name')
          .should.become('Okay / Cancel')
        .nodeify(done);
    });

    it('should find several element', function (done) {
      driver
        .elementByXPath("//UIAStaticText[contains(@label,'Action Sheets')]").click()
        .elementsByName('*Okay*')
          .should.eventually.have.length(2)
        .nodeify(done);
    });
  });


});
