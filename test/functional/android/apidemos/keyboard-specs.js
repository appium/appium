"use strict";

var setup = require("../../common/setup-base")
  , safeClear = require('../../../helpers/safe-clear')
  , _ = require('underscore')
  , desired = require("./desired");

// TODO: fix clear logic
describe("apidemo - keyboard @skip-ci", function () {
  var driver;

  var runTextEditTest = function (testText, done) {
    var el;
    driver
      .waitForElementByClassName('android.widget.EditText')
      .then(function (_el) { el = _el; })
      .then(function () { return safeClear(el); })
      .then(function () { return el.sendKeys(testText); })
      .then(function () { return el.text().should.become(testText); })
      .nodeify(done);
  };

  describe('editing ascii text field', function () {
    setup(this,  _.defaults({
      appActivity: ".view.Controls1"
    }, desired)).then(function (d) { driver = d; });

    it('should be able to edit a text field', function (done) {
      var testText = "Life, the Universe and Everything.";
      runTextEditTest(testText, done);
    });

    // TODO: clear is not reliable
    it('should be able to edit and clear a text field', function (done) {
      var testText = "The answer is 42.", el;
      driver
        .waitForElementByClassName('android.widget.EditText')
        .then(function (_el) { el = _el; })
        .then(function () { return safeClear(el); })
        .then(function () { return el.sendKeys(testText).text().should.become(testText); })
        .then(function () { return safeClear(el); })
        // TODO: there is a bug here we should not need safeClear
        // workaround for now.
        .then(function () { return el.text().should.become(""); })
        .nodeify(done);
    });

    it('should be able to send &-', function (done) {
      var testText = '&-';
      runTextEditTest(testText, done);
    });

    it('should be able to send & and - in other text', function (done) {
      var testText = 'In the mid-1990s he ate fish & chips as mayor-elect.';
      runTextEditTest(testText, done);
    });

    it('should be able to send - in text', function (done) {
      var testText = 'Super-test.';
      runTextEditTest(testText, done);
    });
  });

  describe('editing unicode text field', function () {
    setup(this,  _.defaults({
      appActivity: ".view.Controls1",
      unicodeKeyboard: true,
      resetKeyboard: true
    }, desired)).then(function (d) { driver = d; });

    it('should be able to edit a text field', function (done) {
      var testText = "Life, the Universe and Everything.";
      runTextEditTest(testText, done);
    });

    // TODO: clear is not reliable
    it('should be able to edit and clear a text field', function (done) {
      var testText = "The answer is 42.", el;
      driver
        .waitForElementByClassName('android.widget.EditText')
        .then(function (_el) { el = _el; })
        .then(function () { return safeClear(el); })
        .then(function () { return el.sendKeys(testText).text().should.become(testText); })
        .then(function () { return safeClear(el); })
        // TODO: there is a bug here we should not need safeClear
        // workaround for now.
        .then(function () { return el.text().should.become(""); })
        .nodeify(done);
    });

    it('should be able to send &-', function (done) {
      var testText = '&-';
      runTextEditTest(testText, done);
    });

    it('should be able to send & and - in other text', function (done) {
      var testText = 'In the mid-1990s he ate fish & chips as mayor-elect.';
      runTextEditTest(testText, done);
    });

    it('should be able to send - in text', function (done) {
      var testText = 'Super-test.';
      runTextEditTest(testText, done);
    });

    it('should be able to send - in unicode text', function (done) {
      var testText = 'परीक्षा-परीक्षण';
      runTextEditTest(testText, done);
    });

    it('should be able to send & in text', function (done) {
      var testText = 'Fish & chips';
      runTextEditTest(testText, done);
    });

    it('should be able to send & in unicode text', function (done) {
      var testText = 'Mīna & chips';
      runTextEditTest(testText, done);
    });

    it('should be able to send roman characters with diacritics', function (done) {
      var testText = 'Áé Œ ù ḍ';
      runTextEditTest(testText, done);
    });

    // skipping because clear doesn't work reliably on RTL scripts
    it.skip('should be able to send Arabic', function (done) {
      var testText = 'تجريب';
      runTextEditTest(testText, done);
    });

    // skipping because clear doesn't work reliably on RTL scripts
    it.skip('should be able to send Hebrew', function (done) {
      var testText = 'בדיקות';
      runTextEditTest(testText, done);
    });

    it('should be able to send Tamil', function (done) {
      var testText = 'சோதனை';
      runTextEditTest(testText, done);
    });

    it('should be able to send Gujarati', function (done) {
      var testText = 'પરીક્ષણ';
      runTextEditTest(testText, done);
    });

    it('should be able to send Chinese', function (done) {
      var testText = '测试';
      runTextEditTest(testText, done);
    });

    it('should be able to send Russian', function (done) {
      var testText = 'тестирование';
      runTextEditTest(testText, done);
    });
  });
});
