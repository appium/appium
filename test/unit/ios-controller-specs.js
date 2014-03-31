"use strict";

var chai = require('chai')
  , should = chai.should()
  , sinon = require('sinon')
  , SandboxedModule = require('sandboxed-module')
  , fs = require('fs')
  , path = require('path')
  , controller_path = '../../lib/devices/ios/ios-controller.js'
  , controller = require(controller_path)
  , child_process = require('child_process')
  , createGetElementCommand = controller.createGetElementCommand
  , getSelectorForStrategy = controller.getSelectorForStrategy
  , errors = require('../../lib/server/errors.js')
  , NotYetImplementedError = errors.NotYetImplementedError
  , status = require('../../lib/server/status.js');

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
  describe('#pullFile', function () {
    describe('on a real device', function () {
      before(function () {
        controller.realDevice = true;
      });
      after(function () {
        controller.realDevice = false;
      });
      it('returns a NotYetImplementedError', function () {
        var cb = sinon.spy();
        controller.pullFile("somefile", cb);
        cb.args[0][0].should.be.an.instanceOf(NotYetImplementedError);
      });
    });
    describe('on the simulator', function () {
      before(function () {
        controller.args = {platformVersion: '7.1'};
      });
      describe('with an invalid file', function () {
        beforeEach(function () {
          var stubbedFs = sinon.stub(fs, 'readFile');
          stubbedFs.yields("someErr");
        });
        afterEach(function () {
          fs.readFile.restore();
        });
        it('should return an error', function () {
          var cb = sinon.spy();
          controller.pullFile("", cb);
          cb.args[0][0].should.equal("someErr");
        });
      });
      describe('with a valid file', function () {
        beforeEach(function () {
          var stubbedFs = sinon.stub(fs, 'readFile');
          var data = 'somedata';
          stubbedFs.yields(null, data);
        });
        afterEach(function () {
          fs.readFile.restore();
        });
        it('fetches data from the full path', function () {
          var cb = sinon.spy();
          var user = process.env.USER;
          var expected = path.resolve("/Users", user, "Library", "Application Support",
                                      "iPhone Simulator", "7.1", "Documents", "somefile");
          controller.pullFile('Documents/somefile', cb);
          fs.readFile.args[0][0].should.equal(expected);
        });
        it('returns the data and a success Code', function () {
          var cb = sinon.spy();
          controller.pullFile('somefile', cb);
          cb.args[0][1].should.have.property('status', status.codes.Success.code);
          cb.args[0][1].should.have.property('value', 'somedata');
        });
      });
      describe('inside an application directory', function () {
        var guid = "234234234445795432";
        var user = process.env.USER;
        var rootPath = path.resolve("/Users", user, "Library",
                                    "Application Support", "iPhone Simulator",
                                    "7.1", "Applications");
        var appPath = path.resolve(rootPath, guid, 'greatApp.app');
        var data = 'somedata';

        beforeEach(function () {
          var stubbedFs = sinon.stub(fs, 'readFile');

          stubbedFs.yieldsAsync(null, data);
          var stubbed_child_process = sinon.stub(child_process,
                                                 'exec').yieldsAsync(null, appPath);

          this.controller = SandboxedModule.require(controller_path, {
            locals: {
              "exec": stubbed_child_process.exec
            }
          });

          this.controller.args = {platformVersion: '7.1'};

          return this.controller;
        });
        afterEach(function () {
          fs.readFile.restore();
          child_process.exec.restore();
        });
        it('pulls from that directory, adding a GUID', function (done) {
          var expectedPath = path.resolve(appPath, 'somefile');
          this.controller.args.app = '/some/location/to/a/greatApp.app';
          this.controller.pullFile('/greatApp.app/somefile', function (err, data) {
            data.value.should.equal('somedata');
            fs.readFile.args[0][0].should.equal(expectedPath);
            done();
          });
        });
      });
    });
  });
});