"use strict";

var chai = require('chai')
  , controller_path = '../../lib/devices/ios/ios-controller.js'
  , controller = require(controller_path)
  , createGetElementCommand = controller.createGetElementCommand
  , getSelectorForStrategy = controller.getSelectorForStrategy;

chai.should();

describe('ios-controller', function () {

  describe('#createGetElementCommand', function () {
    it('should return \'GetType\' for name selection', function () {
      var actual = createGetElementCommand('name', 'UIAKey', null, false);
      actual.should.equal("au.getElementByName('UIAKey')");
    });
    it('should return \'GetType\' for id selection', function () {
      var actual = createGetElementCommand('id', 'UIAKey', null, false);
      var expected = "au.getElementById('UIAKey')";
      actual.should.equal(expected);
    });
    it('should return \'GetType\' for tag name selection', function () {
      var actual = createGetElementCommand('tag name', 'UIAKey', null, false);
      actual.should.equal("au.getElementByType('UIAKey')");
    });
    it('should return \'GetType\' for class name selection', function () {
      var actual = createGetElementCommand('class name', 'UIAKey', null, false);
      actual.should.equal("au.getElementByType('UIAKey')");
    });
  });
  describe('#getLocalizedStringForSelector', function () {
    describe('when there are no localizableStrings', function () {
      beforeEach(function () {
        controller.localizableStrings = {};
      });
      it('returns the selector if there are no localizableStrings', function () {
        var actual = controller.getLocalizedStringForSelector('someSelector');
        actual.should.equal('someSelector');
      });
    });
    describe('when there are localizableStrings', function () {
      beforeEach(function () {
        var locString = [{'someSelector': 'localSelector'}];
        controller.localizableStrings = locString;
      });
      afterEach(function () {
        controller.localizableStrings = {};
      });
      it('returns the localized string', function () {
        var actual = controller.getLocalizedStringForSelector('someSelector');
        actual.should.equal('localSelector');
      });
      it('returns the selector if there is not a matching key in localizableStrings', function () {
        var actual = controller.getLocalizedStringForSelector('notFoundSelector');
        actual.should.equal('notFoundSelector');
      });
    });
  });
  describe('#getSelectorForStrategy', function () {
    describe('given a class name', function () {
      it('should allow UIA names', function () {
        getSelectorForStrategy('class name', 'UIAKey').should.equal('UIAKey');
      });
      it('should return an error when given a non-uia name', function () {
        var msg = "The class name selector must use full UIA class " +
                            "names.  Try 'UIAkey' instead.";
        (function () {
          getSelectorForStrategy('class name', 'key');
        }).should.Throw(TypeError, msg);
      });
    });
  });
});
