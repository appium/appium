"use strict";

var setup = require("../../common/setup-base")
    , desired = require("./desired")
    , _ = require('underscore')
    , getAppPath = require('../../../helpers/app').getAppPath;


describe("apidemos - clear", function () {
  var driver;
  var _desired = _.defaults({
    app: getAppPath('ApiDemos'),
    appActivity: '.view.Controls1',
    newCommandTimeout: 90,
    language: 'en',
    locale: 'en_US'
  }, desired);
  setup(this, _desired).then(function (d) { driver = d; });

  describe('clear', function () {
    it('should clear an empty field with hint', function (done) {
      driver
        .waitForElementByClassName('android.widget.EditText')
        .click()
        .sleep(1000)
        .clear()
        .sleep(1000)
        .elementByClassName('android.widget.EditText')
        .text().should.become('hint text')
        .nodeify(done);
    });

    it('should clear a field with hint', function (done) {
      driver
        .waitForElementByClassName('android.widget.EditText')
        .click()
        .sendKeys('Are you looking at me!')
        .sleep(1000)
        .clear()
        .sleep(1000)
        .elementByClassName('android.widget.EditText')
        .text().should.become('hint text')
        .nodeify(done);
    });

  });

  describe('hideKeyboard', function () {

    it('should hide the keyboard using the default strategy', function (done) {
      driver
        .waitForElementByClassName('android.widget.EditText')
        .click()
        .sleep(1000)
        .hideKeyboard()
        .sleep(1000)
        .elementByClassName('android.widget.EditText')
        .should.eventually.exist
        .nodeify(done);
    });

    it('should hide the keyboard using the "Done" key', function (done) {
      driver
        .waitForElementByClassName('android.widget.EditText')
        .click()
        .sleep(1000)
        .hideKeyboard('Done')
        .sleep(1000)
        .elementByClassName('android.widget.EditText')
        .should.eventually.exist
        .nodeify(done);
    });

    it('should hide the keyboard using the "press" strategy and "Done" key', function (done) {
      driver
        .waitForElementByClassName('android.widget.EditText')
        .click()
        .sleep(1000)
        .hideKeyboard({strategy:'press', key: 'Done'})
        .sleep(1000)
        .elementByClassName('android.widget.EditText')
        .should.eventually.exist
        .nodeify(done);
    });

    it('should hide the keyboard using the "pressKey" strategy and "Done" key', function (done) {
      driver
        .waitForElementByClassName('android.widget.EditText')
        .click()
        .sleep(1000)
        .hideKeyboard({strategy:'pressKey', key: 'Done'})
        .sleep(1000)
        .elementByClassName('android.widget.EditText')
        .should.eventually.exist
        .nodeify(done);
    });

    it('should hide the keyboard using the "pressKey" strategy and "Done" key', function (done) {
      driver
        .waitForElementByClassName('android.widget.EditText')
        .click()
        .sleep(1000)
        .hideKeyboard({strategy:'swipeDown'})
        .sleep(1000)
        .elementByClassName('android.widget.EditText')
        .should.eventually.exist
        .nodeify(done);
    });

    it('should hide the keyboard using the "tapOutside" strategy', function (done) {
      driver
        .waitForElementByClassName('android.widget.EditText')
        .click()
        .sleep(1000)
        .hideKeyboard({strategy:'tapOutside'})
        .sleep(1000)
        .elementByClassName('android.widget.EditText')
        .should.eventually.exist
        .nodeify(done);
    });

    it('should hide the keyboard using the "tapOut" strategy', function (done) {
      driver
        .waitForElementByClassName('android.widget.EditText')
        .click()
        .sleep(1000)
        .hideKeyboard({strategy:'tapOut'})
        .sleep(1000)
        .elementByClassName('android.widget.EditText')
        .should.eventually.exist
        .nodeify(done);
    });
  });
});
