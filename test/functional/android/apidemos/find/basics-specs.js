"use strict";

var env = require('../../../../helpers/env')
  , ADB = require('appium-adb')
  , setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , reset = require("../reset")
  , atv = 'android.widget.TextView';

describe("apidemo - find - basics", function () {

  var driver;
  var apiLevel = "0";
  var singleResourceId = "home";
  setup(this, desired).then(function (d) { driver = d; });

  before(function (done) {
    var adb = new ADB({});
    // the app behaves differently on different api levels when it comes to
    // which resource ids are available for testing, so we switch here to make
    // sure we're using the right resource id below
    adb.getApiLevel(function (err, level) {
      if (err) return done(err);
      apiLevel = level;
      if (apiLevel >= "21") {
        singleResourceId = "decor_content_parent";
      }
      done();
    });
  });

  if (env.FAST_TESTS) {
    beforeEach(function () {
      return reset(driver);
    });
  }

  it('should find a single element by content-description', function (done) {
    driver
      .elementByName("Animation").text().should.become("Animation")
      .nodeify(done);
  });
  it('should find an element by class name', function (done) {
    driver
      .elementByClassName("android.widget.TextView").text().should.become("API Demos")
      .nodeify(done);
  });
  it('should find multiple elements by class name', function (done) {
    driver
      .elementsByClassName("android.widget.TextView")
        .should.eventually.have.length.at.least(10)
      .nodeify(done);
  });
  it('should not find an element that doesnt exist', function (done) {
    driver
      .elementByClassName("blargimarg").should.be.rejectedWith(/status: 7/)
      .nodeify(done);
  });
  it('should not find multiple elements that doesnt exist', function (done) {
    driver
      .elementsByClassName("blargimarg").should.eventually.have.length(0)
      .nodeify(done);
  });
  it('should fail on empty locator', function (done) {
    driver.elementsByClassName("")
      .catch(function (err) { throw err.data; }).should.be.rejectedWith(/selector/)
      .elementsByClassName(atv).should.eventually.exist
      .nodeify(done);
  });

  // TODO: The new version of ApiDemo doesn't use id, find a better example.
  it('should find a single element by id @skip-android-all', function (done) {
    driver
      .complexFind(["scroll", [[3, "views"]], [[7, "views"]]]).click()
      .elementByXPath("//android.widget.TextView[@text='Buttons']").click()
      .elementById("buttons_1_normal").text().should.become("Normal")
      .nodeify(done);
  });
  // TODO: The new version of ApiDemo doesn't use id, find a better example.
  it('should find a single element by string id @skip-android-all', function (done) {
    driver
      .elementById("activity_sample_code").text().should.become("API Demos")
      .nodeify(done);
  });
  it('should find a single element by resource-id', function (done) {
    driver
      .elementById('android:id/' + singleResourceId).should.eventually.exist
      .nodeify(done);
  });
  it('should find multiple elements by resource-id', function (done) {
    driver
      .elementsById('android:id/text1')
        .should.eventually.have.length.at.least(10)
      .nodeify(done);
  });
  it('should find multiple elements by resource-id even when theres just one', function (done) {
    driver
      .elementsById('android:id/' + singleResourceId)
      .then(function (els) {
        els.length.should.equal(1);
      })
      .nodeify(done);
  });
  it('should find a single element by resource-id with implicit package', function (done) {
    driver
      .elementById(singleResourceId).should.eventually.exist
      .nodeify(done);
  });
  it('should find multiple elements by resource-id with implicit package', function (done) {
    driver
      .elementsById('text1')
        .should.eventually.have.length.at.least(10)
      .nodeify(done);
  });
  it('should find multiple elements by resource-id  with implicit package even when theres just one', function (done) {
    driver
      .elementsById(singleResourceId)
      .then(function (els) {
        els.length.should.equal(1);
      })
      .nodeify(done);
  });
});
