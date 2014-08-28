"use strict";

var setup = require("../../common/setup-base")
  , env = require("../../../helpers/env.js")
  , desired = require('./desired')
  , _ = require('underscore');

describe('uicatalog - find - basics @skip-ios6', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should find a single element by id', function (done) {
    driver
      .elementById('Date Picker')
        .should.eventually.exist
      .nodeify(done);
  });

  it('should find a single element by id wrapped in array for multi', function (done) {
    driver
      .elementsById('Back')
      .then(function (els) {
        els.length.should.equal(1);
      })
      .nodeify(done);
  });

  it('should find a single element using elementByAccessibilityId', function (done) {
    var axId = env.IOS8 ? 'AAPLImageViewController' :
                          'Image View, AAPLImageViewController';
    driver
      .elementByAccessibilityId(axId)
      .then(function (el) {
        el.should.exist;
      }).nodeify(done);
  });
  it('should find an element within descendants', function (done) {
    driver
      .elementByXPath("//UIATableCell[contains(@name, 'Buttons')]")
      .then(function (el) {
        el.should.exist;
        return el.elementByClassName('UIAStaticText').getAttribute('name')
          .should.eventually.contain("Buttons");
      }).nodeify(done);
  });

  it('should not find an element not within itself', function (done) {
    driver
      .elementByXPath("//UIATableCell[contains(@name, 'Buttons')]")
      .then(function (el) {
        el.should.exist;
        return el.elementByClassName('UIANavigationBar')
          .should.be.rejectedWith(/status: 7/);
      }).nodeify(done);
  });

  it('should find some elements within itself', function (done) {
    var elLength = env.IOS8 ? 2 : 1;
    driver
      .elementByXPath("//UIATableCell[contains(@name, 'Buttons')]")
      .then(function (el) {
        el.should.exist;
        return el.elementsByClassName('UIAStaticText')
          .should.eventually.have.length(elLength);
      }).nodeify(done);
  });

  it('should not find elements not within itself', function (done) {
    driver
      .elementByXPath("//UIATableCell[contains(@name, 'Buttons')]")
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
    var axIdExt = env.IOS8 ? '' : ', AAPLActionSheetViewController';
    it('should find only one textfield', function (done) {
      driver
        .elementByAccessibilityId("Action Sheets" + axIdExt).click()
        .elementByAccessibilityId('Okay / Cancel')
        .elementsByClassName('>', 'UIAStaticText')
          .should.eventually.have.length(1)
        .nodeify(done);
    });
  });

  describe('findElement(s) containing accessibility id', function () {
    afterEach(function (done) {
      driver
        .clickButton('UICatalog')
        .sleep(1000)
        .nodeify(done);
    });

    var axIdExt = env.IOS8 ? '' : ', AAPLActionSheetViewController';
    it('should find one element', function (done) {
      driver
        .elementByAccessibilityId("Action Sheets" + axIdExt).click()
        .elementByAccessibilityId('Okay / Cancel').getAttribute('name')
          .should.become('Okay / Cancel')
        .nodeify(done);
    });

    it('should find several elements', function (done) {
      driver
        .elementByAccessibilityId("Action Sheets" + axIdExt).click()
        .elementsByAccessibilityId('Okay / Cancel')
          .should.eventually.have.length(2)
        .nodeify(done);
    });
  });

  describe('duplicate text field', function () {
    afterEach(function (done) {
      driver
        .clickButton('UICatalog')
        .sleep(1000)
        .nodeify(done);
    });

    var axIdExt = env.IOS8 ? '' : ', AAPLTextFieldViewController';
    it('should find only one element per text field', function (done) {
      driver
        .execute("mobile: scroll", {direction: 'down'})
        .waitForElementByAccessibilityId('Text Fields' + axIdExt, 3000, 500)
          .click()
        .sleep(2000)
        .elementsByClassName('UIATextField')
          .should.eventually.have.length(4)
        .nodeify(done);
    });

    it('should find only one element per secure text field', function (done) {
      driver
        .waitForElementByAccessibilityId('Text Fields' + axIdExt, 3000, 500)
          .click()
        .sleep(2000)
        .elementsByClassName('UIASecureTextField')
          .should.eventually.have.length(1)
        .nodeify(done);
    });
  });
});
