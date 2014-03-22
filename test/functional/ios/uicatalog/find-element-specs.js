"use strict";

var setup = require("../../common/setup-base")
  , desired = require('./desired')
  , Q = require("q")
  , _ = require("underscore")
  , spinWait = require("../../../helpers/spin.js").spinWait;

describe('uicatalog - find element -', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should find a single element by id', function (done) {
    // ButtonsExplain: 'Various uses of UIButton'
    driver
      .elementById('ButtonsExplain')
        .should.eventually.exist
      .nodeify(done);
  });

  it('should find a single element by name', function (done) {
    driver
      .execute("mobile: findElementNameContains", [{name: 'uses of UIButton'}])
        .getAttribute('name').should.become("Buttons, Various uses of UIButton")
      .nodeify(done);
  });
  it('should find a single element using elementByName', function (done) {
    driver
      .elementByName('UICatalog').then(function (el) {
        el.should.exist;
      }).nodeify(done);
  });
  it('should find an element within descendants', function (done) {
    driver
      .elementByTagName('tableView').then(function (el) {
        el.should.exist;
        return el.elementByTagName('text').getAttribute('name')
          .should.become("Buttons, Various uses of UIButton");
      }).nodeify(done);
  });

  it('should not find an element not within itself', function (done) {
    driver
      .elementByTagName('tableView').then(function (el) {
        el.should.exist;
        return el.elementByTagName('navigationBar')
          .should.be.rejectedWith(/status: 7/);
      }).nodeify(done);
  });

  it('should find some elements within itself', function (done) {
    driver
      .elementByTagName('tableCell').then(function (el) {
        el.should.exist;
        return el.elementsByTagName('text')
          .should.eventually.have.length(1);
      }).nodeify(done);
  });

  it('should not find elements not within itself', function (done) {
    driver
      .elementByTagName('tableCell').then(function (el) {
        el.should.exist;
        el.elementsByTagName('navigationBar')
          .should.eventually.have.length(0);
      }).nodeify(done);
  });

  describe('findElementsByTagName', function () {
    it('should return all image elements with internally generated ids', function (done) {
      driver.elementsByTagName('image').then(function (els) {
        els.length.should.be.above(0);
        _(els).each(function (el) {
          el.should.exist;
        });
      }).nodeify(done);
    });
  });

  describe('findElementsByTagName textfield case', function () {
    after(function (done) {
      driver.clickBack()
      .nodeify(done);
    });
    it('should find only one textfield', function (done) {
      driver
        .elementsByTagName('cell').then(function (els) { return els[2]; })
          .click()
        .elementByName('Rounded')
        .elementsByTagName('>', 'textfield')
          .should.eventually.have.length(1)
        .nodeify(done);
    });
  });


  describe('findElement(s)ByXpath', function () {
    var setupXpath = function (driver) {
      return driver.elementByTagName('tableCell').click();
    };

    if (process.env.FAST_TESTS) {
      afterEach(function (done) {
        driver
          .back()
          .nodeify(done);
      });
    }

    it('should return the last button', function (done) {
      driver
        .resolve(setupXpath(driver))
        .elementByXPath("//button[last()]").text()
          .should.become("Add contact")
        .nodeify(done);
    });
    it('should return a single element', function (done) {
      driver
        .resolve(setupXpath(driver))
        .elementByXPath("//button").text()
          .should.become("Back")
        .nodeify(done);
    });
    it('should return multiple elements', function (done) {
      driver
        .resolve(setupXpath(driver))
        .elementsByXPath("//button")
          .should.eventually.have.length.above(5)
        .nodeify(done);
    });
    it('should filter by name', function (done) {
      driver
        .resolve(setupXpath(driver))
        .elementByXPath("button[@name='Rounded']").text()
          .should.become("Rounded")
        .nodeify(done);
    });
    it('should know how to restrict root-level elements', function (done) {
      driver
        .resolve(setupXpath(driver))
        .elementByXPath("/button")
          .should.be.rejectedWith(/status: 7/)
        .nodeify(done);
    });
    it('should search an extended path by child', function (done) {
      driver
        .resolve(setupXpath(driver))
        .then(function () {
          return spinWait(function () {
            return driver.elementByXPath("navigationBar/text")
              .text().should.become('Buttons');
          });
        }).nodeify(done);
    });
    it('should search an extended path by descendant', function (done) {
      driver
        .resolve(setupXpath(driver))
        .elementsByXPath("cell//button").then(function (els) {
          return Q.all(_(els).map(function (el) { return el.text(); }));
        }).then(function (texts) {
          texts.should.not.include("Button");
          texts.should.include("Gray");
        }).nodeify(done);
    });
    it('should filter by indices', function (done) {
      driver
        .resolve(setupXpath(driver))
        .then(function () {
          return spinWait(function () {
            return driver.elementByXPath("cell[2]//text[1]").getAttribute('name')
                .should.become("ButtonsViewController.m:\r(UIButton *)grayButton");
          });
        }).nodeify(done);
    });
    it('should filter by partial text', function (done) {
      driver
        .resolve(setupXpath(driver))
        .elementByXPath("cell//button[contains(@name, 'Gr')]").text()
          .should.become("Gray")
        .nodeify(done);
    });
  });

  describe('FindElement(s)ByUIAutomation', function () {

    before(function (done) {
      driver.element('-ios_uiautomation', '.navigationBars()[0]')
      .getAttribute('name').then(function (name) {
        if (name !== 'UICatalog') {
          driver.back().then(done);
        } else {
          done();
        }
      });
    });

    it('should process most basic UIAutomation query', function (done) {
      driver.elements('-ios_uiautomation', '.elements()').then(function (els) {
        els.length.should.equal(2);
        _(els).each(function (el) {
          el.should.exist;
        });
      }).nodeify(done);
    });
    it('should process UIAutomation queries if user leaves out the first period', function (done) {
      driver.elements('-ios_uiautomation', 'elements()').then(function (els) {
        els.length.should.equal(2);
        _(els).each(function (el) {
          el.should.exist;
        });
      }).nodeify(done);
    });
    it('should get a single element', function (done) {
      driver.element('-ios_uiautomation', '.elements()[0]').getAttribute('name')
      .should.become('UICatalog')
      .nodeify(done);
    });
    it('should get a single element', function (done) {
      driver.element('-ios_uiautomation', '.elements()[1]').getAttribute('name')
      .should.become('Empty list')
      .nodeify(done);
    });
    it('should get single element as array', function (done) {
      driver.elements('-ios_uiautomation', '.tableViews()[0]').then(function (els) {
        els.length.should.equal(1);
      }).nodeify(done);
    });
    it('should find elements by index multiple times', function (done) {
      driver.element('-ios_uiautomation', '.elements()[1].cells()[2]').getAttribute('name')
      .should.become('TextFields, Uses of UITextField')
      .nodeify(done);
    });
    it('should find elements by name', function (done) {
      driver.element('-ios_uiautomation', '.elements()["UICatalog"]').getAttribute('name')
      .should.become('UICatalog')
      .nodeify(done);
    });
    it('should find elements by name and index', function (done) {
      driver.element('-ios_uiautomation', '.elements()["Empty list"].cells()[3]').getAttribute('name')
      .should.become('SearchBar, Use of UISearchBar')
      .nodeify(done);
    });
    describe('start from a given context instead of root target', function (done) {
      it('should process a simple query', function (done) {
        driver.element('-ios_uiautomation', '.elements()[1]').then(function (el) {
          el.elements('-ios_uiautomation', '.elements()').then(function (els) {
            els.length.should.equal(12);
            _(els).each(function (el) {
              el.should.exist;
            });
          }).nodeify(done);
        });
      });
      it('should find elements by name', function (done) {
        driver.element('-ios_uiautomation', '.elements()[1]').then(function (el) {
          el.element('-ios_uiautomation', '.elements()["Buttons, Various uses of UIButton"]').then(function (el) {
            el.should.exist;
          }).nodeify(done);
        });
      });
    });
  });
});
