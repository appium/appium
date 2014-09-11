"use strict";

var env = require('../../helpers/env')
  , setup = require("./setup-base")
  , _ = require('underscore')
  , getAppPath = require('../../helpers/app').getAppPath;


var desired = {
  app: getAppPath('ApiDemos'),
  appActivity: '.view.Controls1',
  newCommandTimeout: 90
};
if (env.SELENDROID) {
  desired.automationName = 'selendroid';
}

module.exports = function () {
  var driver;

  var runTextEditTest = function (testText, done) {
    var el;
    driver
      .waitForElementByClassName('android.widget.EditText')
      .then(function (_el) { el = _el; })
      .then(function () {
        if (env.SELENDROID) {
          return el.clear();
        }
      })
      .then(function () { return el.sendKeys(testText); })
      .then(function () { return el.text().should.become(testText); })
      .nodeify(done);
  };

  var runEditAndClearTest = function (testText, done) {
    var el;
    driver
      .waitForElementByClassName('android.widget.EditText')
      .then(function (_el) { el = _el; })
      .then(function () {
        if (env.SELENDROID) {
          return el.clear();
        }
      })
      .then(function () { return el.sendKeys(testText).text().should.become(testText); })
      .then(function () {
        return el.clear().should.not.be.rejected;
      })
      .then(function () {
        // Selendroid and uiautomator have different ways of dealing with
        // hint text. In particular, Selendroid does not return it
        // and uiautomator does.
        var expectedText = "hint text";
        if (env.SELENDROID) {
          expectedText = "";
        }
        return el.text().should.become(expectedText);
      })
      .nodeify(done);
  };

  describe('editing ascii text field', function () {
    setup(this, desired).then(function (d) { driver = d; });

    it('should be able to edit a text field', function (done) {
      var testText = "Life, the Universe and Everything.";
      runTextEditTest(testText, done);
    });

    it('should be able to edit and manually clear a text field', function (done) {
      var testText = "The answer is 42.";
      runEditAndClearTest(testText, done);
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
      unicodeKeyboard: true,
      resetKeyboard: true
    }, desired)).then(function (d) { driver = d; });

    it('should be able to edit a text field', function (done) {
      var testText = "Life, the Universe and Everything.";
      runTextEditTest(testText, done);
    });

    it('should be able to edit and manually clear a text field', function (done) {
      var testText = "The answer is 42.";
      runEditAndClearTest(testText, done);
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
};
