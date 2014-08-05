"use strict";

var setup = require("../../common/setup-base")
  , _ = require('underscore')
  , desired = require("./desired");

describe("apidemo - ime", function () {
  var unicodeImeId = 'io.appium.android.ime/.UnicodeIME'
    , driver;

  setup(this, _.defaults({
    appActivity: "view.Controls1",
    unicodeKeyboard: true,
    resetKeyboard: true
  }, desired)).then(function (d) { driver = d; });

  beforeEach(function (done) {
    driver.resetApp().nodeify(done);
  });

  it('should get the default (enabled) input method', function (done) {
    driver
      .activeIMEEngine()
      .should.eventually.equal(unicodeImeId)
      .nodeify(done);
  });

  it('should get the available input methods', function (done) {
    driver
      .availableIMEEngines()
      .should.eventually.have.length.at.least(4)
      .nodeify(done());
  });

  it('should activate an installed input method', function (done) {
    driver
      .activateIMEEngine(unicodeImeId)
      .should.not.be.rejected
      .nodeify(done());
  });

  it('should fail to activate an uninstalled input method', function (done) {
    var invalidImeId = "sdf.wer.gdasdfsf/.OsdfEfgd";
    driver
      .activateIMEEngine(invalidImeId)
      .should.be.rejectedWith(/status: 30/)
      .nodeify(done());
  });

  it('should deactivate the current input method', function (done) {
    driver
      .activateIMEEngine(unicodeImeId)
      .activeIMEEngine().should.eventually.equal(unicodeImeId)
      .deactivateIMEEngine()
      .activeIMEEngine().should.eventually.not.equal(unicodeImeId)
      .nodeify(done);
  });
});
