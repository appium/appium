"use strict";

var setup = require("../../common/setup-base")
  , desired = require("./desired")
  , _ = require('underscore');

describe("apidemo - keyboard", function () {
  var driver;
  setup(this,  _.defaults({appActivity: "view.Controls1" }, desired))
    .then(function (d) { driver = d; });

  beforeEach(function (done) {
      driver.resetApp().nodeify(done);
  });

  it('should be able to edit a text field', function (done) {
    var testText = "this is awesome!";
    runTextEditTest(testText, done);
  });

  //todo: not working in nexus 7
  it('should be able to edit and clear a text field', function (done) {
    var testText = "this is awesome!";
    var el = function () {
      return driver.elementByClassName('android.widget.EditText');
    };
    driver
      .resolve(el()).clear().text().should.become("")
      .then(el).sendKeys(testText).text().should.become(testText)
      .sleep(2)
      .then(el).clear().text().should.become("")
      .nodeify(done);
  });

  describe('editing unicode text field', function () {
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

    it('should be able to send & in text', function (done) {
      var testText = 'Fish & chips';
      runTextEditTest(testText, done);
    });

    it.skip('should be able to send roman characters with diacritics', function (done) {
      var testText = 'Áé Œ ù ḍ';
      runTextEditTest(testText, done);
    });

    it.skip('should be able to send Arabic', function (done) {
      var testText = 'تجريب';
      runTextEditTest(testText, done);
    });

    it.skip('should be able to send Hebrew', function (done) {
      var testText = 'בדיקות';
      runTextEditTest(testText, done);
    });

    it.skip('should be able to send Tamil', function (done) {
      var testText = 'சோதனை';
      runTextEditTest(testText, done);
    });

    it.skip('should be able to send Hindi', function (done) {
      var testText = 'परीक्षण';
      runTextEditTest(testText, done);
    });

    it.skip('should be able to send Gujarati', function (done) {
      var testText = 'પરીક્ષણ';
      runTextEditTest(testText, done);
    });

    it.skip('should be able to send Bengali', function (done) {
      var testText = 'টেস্টিং';
      runTextEditTest(testText, done);
    });

    it.skip('should be able to send Chinese', function (done) {
      var testText = '测试';
      runTextEditTest(testText, done);
    });

    it.skip('should be able to send Japanese', function (done) {
      var testText = '検査';
      runTextEditTest(testText, done);
    });

    it.skip('should be able to send Georgian', function (done) {
      var testText = 'ტესტირება';
      runTextEditTest(testText, done);
    });

    it.skip('should be able to send Russian', function (done) {
      var testText = 'тестирование';
      runTextEditTest(testText, done);
    });
  });

  var runTextEditTest = function (testText, done) {
    var el = function () {
      return driver.elementByClassName('android.widget.EditText');
    };
    driver
      .sleep(1)
      .resolve(el()).clear().text().should.become('')
      .then(el).sendKeys(testText).text().should.become(testText)
      .nodeify(done);
  };
});
