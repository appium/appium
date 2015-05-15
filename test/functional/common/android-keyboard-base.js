"use strict";

var env = require('../../helpers/env')
  , setup = require("./setup-base")
  , _ = require('underscore')
  , getAppPath = require('../../helpers/app').getAppPath;


var desired = {
  app: getAppPath('ApiDemos'),
  newCommandTimeout: 90
};
if (env.SELENDROID) {
  desired.automationName = 'selendroid';
}

var runTextEditTest = function (driver, testText, keys, done) {
  var el;
  driver
    .waitForElementsByClassName('android.widget.EditText')
    // use a text field with no hint text, so clear is faster
    .then(function (els) {
      el = _.last(els);
      return el;
    })
    .clear()
    .then(function () {
      if (keys) {
        return driver.keys(testText);
      } else {
        return el.sendKeys(testText);
      }
    })
    .then(function () {
      if (env.SELENDROID) {
        // in Selendroid mode we sometimes get the text before
        // it is fully sent to the element
        return driver.sleep(300);
      }
    })
    .then(function () { return el.text(); })
    .then(function (text) {
      // For samsung samsung S5 text is appended with ". Editing."
      text = text.replace(". Editing.", "");
      return text.should.be.equal(testText);
    })
    .nodeify(done);
};

var runEditAndClearTest = function (driver, testText, keys, done) {
  var el;
  driver
    .waitForElementsByClassName('android.widget.EditText')
    .then(function (els) {
      el = _.last(els);
      return el;
    })
    .clear()
    .then(function () {
      if (keys) {
        return driver.keys(testText);
      } else {
        return el.sendKeys(testText);
      }
    })
    .then(function () {
      el.text().should.become(testText);
    })
    .then(function () {
      return el.clear().should.not.be.rejected;
    })
    .then(function () {
      return el.text();
    })
    .then(function (text) {
      // For samsung samsung S5 text is appended with ". Editing."
      text = text.replace("Editing.", "");
      text.should.be.equal("");
    })
    .nodeify(done);
};

var runKeyboardTests = function (driverPromise, testText) {
  var driver;
  driverPromise.then(function (d) { driver = d; });

  it('should work with sendKeys', function (done) {
    runTextEditTest(driver, testText, false, done);
  });
  it('should work with keys', function (done) {
    runTextEditTest(driver, testText, true, done);
  });
};

var runKeyEventTests = function (driverPromise) {
  var driver;
  driverPromise.then(function (d) { driver = d; });

  var editTextField = 'android.widget.TextView';
  if (env.SELENDROID) {
    // with Selendroid we can't find classes by their parent class
    // and with uiautomator we can't find the subclass.
    editTextField = 'io.appium.android.apis.text.LogTextBox';
  }

  // skip selendroid because selendroid implements keyevent with an adb
  // call, and we are unable to send metastate that way
  it('should be able to send combination keyevents @skip-selendroid-all', function (done) {
    driver
      .elementById('clear').click()
      .pressDeviceKey(29, 193)
      .elementsByClassName(editTextField)
      .then(function (els) {
        return _.last(els).text();
      })
      .then(function (txt) {
        txt.should.include('keyCode=KEYCODE_A');
        txt.should.include('metaState=META_SHIFT_ON');
      })
      .nodeify(done);
  });

  it('should be able to send keyevents', function (done) {
    driver
      .elementById('clear').click()
      .pressDeviceKey(82)
      .elementsByClassName(editTextField)
      .then(function (els) {
        return _.last(els).text();
      })
      .then(function (txt) {
        txt.should.include('[keycode=82]');
        txt.should.include('keyCode=KEYCODE_MENU');
      })
      .nodeify(done);
  });
};

var runManualClearTests = function (driverPromise) {
  var driver;
  driverPromise.then(function (d) { driver = d; });

  var testText = "The answer is 42.";
  it('should work with sendKeys', function (done) {
    runEditAndClearTest(driver, testText, false, done);
  });
  it('should work with keys', function (done) {
    runEditAndClearTest(driver, testText, true, done);
  });
};

var appActivity = '.view.TextFields';
var tests = [
  { label: 'editing a text field', text: 'Life, the Universe and Everything.' },
  { label: 'sending &-', text: '&-' },
  { label: 'sending & and - in other text', text: 'In the mid-1990s he ate fish & chips as mayor-elect.' },
  { label: 'sending - in text', text: 'Super-test.' },
];

var unicodeTests = _.union(tests, [
  { label: 'should be able to send - in unicode text', text: 'परीक्षा-परीक्षण' },
  { label: 'should be able to send & in text', text: 'Fish & chips' },
  { label: 'should be able to send & in unicode text', text: 'Mīna & chips' },
  { label: 'should be able to send roman characters with diacritics', text: 'Áé Œ ù ḍ' },
  { label: 'should be able to send a u with an umlaut', text: 'ü' },
]);

var languageTests = [
  { label: 'should be able to send Tamil', text: 'சோதனை' },
  { label: 'should be able to send Gujarati', text: 'પરીક્ષણ' },
  { label: 'should be able to send Chinese', text: '测试' },
  { label: 'should be able to send Russian', text: 'тестирование' },
  // skip rtl languages, which don't clear correctly atm
  // { label: 'should be able to send Arabic', 'تجريب'],
  // { label: 'should be able to send Hebrew', 'בדיקות'],
];

exports.textFieldTests = function (exclude) {
  describe('editing a text field', function () {
    describe('ascii', function () {
      var driverPromise = setup(this, _.defaults({
        appActivity: appActivity
      }, desired));

      _(tests).chain().filter(function (test) {
        return !exclude || exclude.indexOf(test.text) < 0;
      }).each(function (test) {
        describe(test.label, function () {
          runKeyboardTests(driverPromise, test.text);
        });
      }).value();

      describe('editing and manually clearing a text field', function () {
        runManualClearTests(driverPromise);
      });
    });
  });
};

exports.unicodeTextFieldTests = function (exclude) {
  describe('unicode', function () {
    var driverPromise = setup(this,  _.defaults({
      appActivity: appActivity,
      unicodeKeyboard: true,
      resetKeyboard: true
    }, desired));

    _(unicodeTests).chain().filter(function (test) {
        return !exclude || exclude.indexOf(test.text) < 0;
      }).each(function (test) {
      describe(test.label, function () {
        runKeyboardTests(driverPromise, test.text);
      });
    }).value();

    describe('editing and manually clearing a text field', function () {
      runManualClearTests(driverPromise);
    });
  });
};

exports.unicodeLanguagesTests = function () {
  describe('unicode', function () {
    var driverPromise = setup(this,  _.defaults({
      appActivity: appActivity,
      unicodeKeyboard: true,
      resetKeyboard: true
    }, desired));

    _.each(languageTests, function (test) {
      describe(test.label, function () {
        runKeyboardTests(driverPromise, test.text);
      });
    });

    describe('editing and manually clearing a text field', function () {
      runManualClearTests(driverPromise);
    });
  });
};


exports.keyEventsTests = function () {
  describe('key events', function () {
    var appActivity = '.text.KeyEventText';
    describe('ascii', function () {
      var driverPromise = setup(this, _.defaults({
        appActivity: appActivity
      }, desired));
      describe('pressing device key', function () {
        runKeyEventTests(driverPromise);
      });
    });
    describe('unicode', function () {
      var driverPromise = setup(this, _.defaults({
        appActivity: appActivity,
        unicodeKeyboard: true,
        resetKeyboard: true
      }, desired));
      describe('pressing device key', function () {
        runKeyEventTests(driverPromise);
      });
    });
  });
};
