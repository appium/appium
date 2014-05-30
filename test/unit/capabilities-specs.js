"use strict";

var Capabilities = require('../../lib/server/capabilities.js')
  , loggerjs = require('../../lib/server/logger')
  , logger = loggerjs.get('appium')
  , sinon = require('sinon')
  , chai = require('chai')
  , should = chai.should()
  , _ = require('underscore');

describe('capabilities', function () {
  describe('#new', function () {
    it('should convert object caps to strings', function () {
      var c = new Capabilities({app: {some: 'object'}, platformVersion: 'hi'});
      c.app.should.equal('{"some":"object"}');
    });
    it('should leave undefined, null, numbers alone', function () {
      var c = new Capabilities({appPackage: null, bob: undefined, platformVersion: 7.0});
      should.not.exist(c.appPackage);
      (typeof c.appPackage).should.equal("object");
      (typeof c.bob).should.equal("undefined");
      c.platformVersion.should.equal(7.0);
      (typeof c.platformVersion).should.equal("number");
    });
    describe('with mjsonwp capabilities', function () {
      describe('deprecation warnings', function () {
        var newCapabilities = [
          'platformName',
          'platformVersion'
        ];

        beforeEach(function () {
          sinon.spy(logger, "warn");
        });
        afterEach(function () {
          logger.warn.restore();
        });

        _.each(newCapabilities, function (item) {
          var specName = "Should not be thrown for " + item;
          it(specName, function () {
            var fakeCaps = {};
            fakeCaps[item] = 'dontcare';
            new Capabilities(fakeCaps);
            (logger.warn.called).should.be.false;
          });
        });
      });
    });
  });

  describe('#checkStrictValidity', function () {

    var capsShouldPass = function (dt, caps) {
      var c = new Capabilities(caps);
      c.checkStrictValidity(dt);
    };

    var capsShouldFail = function (dt, caps) {
      var err = null;
      try {
        capsShouldPass(dt, caps);
      } catch (e) {
        err = e;
      }
      should.exist(err);
    };

    var iosHappyCaps = {platformName: 'iOS', platformVersion: '7.1',
        deviceName: 'iPhone Simulator', app: 'foo'};

    var androidHappyCaps = {platformName: 'Android',
        platformVersion: '4.2', deviceName: 'Android Emulator',
        browserName: 'Chrome'};

    it('should not care about selendroid', function () {
      var c = new Capabilities({});
      (typeof c.checkStrictValidity("selendroid")).should.equal("undefined");
    });

    it('should not allow unknown caps', function () {
      capsShouldFail('ios', _.extend(_.clone(iosHappyCaps), {fooBar: 'lol'}));
      capsShouldFail('android', _.extend(_.clone(androidHappyCaps), {fooBar: 'lol'}));
    });

    it('should enforce required caps', function () {
      capsShouldFail('ios', {safariAllowPopups: 'lol'});
      capsShouldFail('android', {useKeystore: 'lol'});
      capsShouldPass('ios', iosHappyCaps);
      capsShouldPass('android', androidHappyCaps);
    });

    it('should enforce browserName/app', function () {
      var badIos = _.clone(iosHappyCaps);
      delete badIos.app;
      var badAnd = _.clone(androidHappyCaps);
      delete badAnd.browserName;
      capsShouldFail('ios', badIos);
      capsShouldFail('android', badAnd);
    });

    it('should not allow caps unknown for device type', function () {
      capsShouldFail('ios', _.extend(_.clone(iosHappyCaps), {avd: 'foo'}));
      capsShouldFail('android', _.extend(_.clone(androidHappyCaps), {bundleId: 'foo'}));
    });

  });
});
