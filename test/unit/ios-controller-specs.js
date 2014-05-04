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
    it('should return \'GetType\' for xpath selection', function () {
      var actual = createGetElementCommand('xpath', 'UIAKey', null, false);
      actual.should.equal("au.getElementByXpath('UIAKey')");
    });
    it('should return \'GetType\' for id selection', function () {
      var actual = createGetElementCommand('id', 'UIAKey', null, false);
      var expected = "var exact = au.mainApp().getFirstWithPredicateWeighted" +
                     "(\"name == 'UIAKey' || label == 'UIAKey' || value == '" +
                     "UIAKey'\");exact && exact.status == 0 ? exact : " +
                     "au.mainApp().getFirstWithPredicateWeighted(\"name " +
                     "contains[c] 'UIAKey' || label contains[c] 'UIAKey' || " +
                     "value contains[c] 'UIAKey'\");";
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
    describe('given an id', function () {
      describe('when there are no localizableStrings', function () {
        beforeEach(function () {
          controller.localizableStrings = {};
        });
        it('returns the selector if there aren\'t localizableStrings', function () {
          var actual = controller.getSelectorForStrategy('id', 'someSelector');
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
          var actual = controller.getSelectorForStrategy('id', 'someSelector');
          actual.should.equal('localSelector');
        });
      });
    });
  });
});
