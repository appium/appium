"use strict";

var setup = require("../../common/setup-base")
    , desired = require("./desired")
    , _ = require('underscore')
    , getAppPath = require('../../../helpers/app').getAppPath;


describe("apidemos - clear", function () {
  var driver;
  var _desired = _.defaults({
    app: getAppPath('ApiDemos'),
    appActivity: '.view.TableLayout10',
    newCommandTimeout: 90,
    language: 'en',
    locale: 'en_US'
  }, desired);
  setup(this, _desired).then(function (d) { driver = d; });

  describe('clear textfield', function () {
    it('should clear an empty field with hint', function (done) {
      var el;
      driver
        .waitForElementByClassName('android.widget.EditText')
        .then(function (_el) {
          el = _el;
          return el;
        })
        .clear()
        .sleep(100)
        .then(function () {
          return el;
        })
        .text().should.become('enter username')
        .nodeify(done);
    });

    it('should clear a field with hint', function (done) {
      var el;
      driver
        .waitForElementByClassName('android.widget.EditText')
        .then(function (_el) {
          el = _el;
          return el;
        })
        .sendKeys('Are you looking at me!')
        .sleep(100)
        .clear()
        .sleep(100)
        .then(function () {
          return el;
        })
        .text().should.become('enter username')
        .nodeify(done);
    });

  });

  describe('clear password textfield', function () {
    it('should clear', function (done) {
      var el;
      driver
        .waitForElementsByClassName('android.widget.EditText')
        .then(function (els) {
          el = els[1];
          return el;
        })
        .sendKeys('super secure password')
        .sleep(100)
        .then(function () {
          el.text().should.become('super secure password');
          return el;
        })
        .clear()
        .sleep(100)
        .then(function () {
          return el;
        })
        .text().should.become('')
        .nodeify(done);
    });

  });

  describe('hideKeyboard', function () {
    var testHideKeyboard = function (args, done) {
      driver
        .waitForElementByClassName('android.widget.EditText')
        .click()
        .sleep(500)
        .hideKeyboard(args)
        .sleep(500)
        .elementByClassName('android.widget.EditText')
          .should.eventually.exist
        .nodeify(done);
    };

    it('should hide the keyboard using the default strategy', function (done) {
      testHideKeyboard(null, done);
    });

    it('should hide the keyboard using the "Done" key', function (done) {
      testHideKeyboard('Done', done);
    });

    it('should hide the keyboard using the "press" strategy and "Done" key', function (done) {
      testHideKeyboard({strategy:'press', key: 'Done'}, done);
    });

    it('should hide the keyboard using the "pressKey" strategy and "Done" key', function (done) {
      testHideKeyboard({strategy:'pressKey', key: 'Done'}, done);
    });

    it('should hide the keyboard using the "pressKey" strategy and "Done" key', function (done) {
      testHideKeyboard({strategy:'swipeDown'}, done);
    });

    it('should hide the keyboard using the "tapOutside" strategy', function (done) {
      testHideKeyboard({strategy:'tapOutside'}, done);
    });

    it('should hide the keyboard using the "tapOut" strategy', function (done) {
      testHideKeyboard({strategy:'tapOut'}, done);
    });
  });
});
