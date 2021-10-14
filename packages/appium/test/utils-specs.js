import {
  parseCapsForInnerDriver, insertAppiumPrefixes, pullSettings,
  removeAppiumPrefixes
} from '../lib/utils';
import { BASE_CAPS, W3C_CAPS } from './helpers';
import _ from 'lodash';

describe('utils', function () {
  describe('parseCapsForInnerDriver()', function () {
    it('should return an error if only JSONWP provided', function () {
      let {error, protocol} = parseCapsForInnerDriver(BASE_CAPS);
      protocol.should.equal('W3C');
      error.message.should.match(/W3C/);
    });
    it('should return W3C caps unchanged if only W3C caps were provided', function () {
      let {desiredCaps, processedJsonwpCapabilities, processedW3CCapabilities, protocol} = parseCapsForInnerDriver(undefined, W3C_CAPS);
      desiredCaps.should.deep.equal(BASE_CAPS);
      should.not.exist(processedJsonwpCapabilities);
      processedW3CCapabilities.should.deep.equal(W3C_CAPS);
      protocol.should.equal('W3C');
    });
    it('should return JSONWP and W3C caps if both were provided', function () {
      let {desiredCaps, processedJsonwpCapabilities, processedW3CCapabilities, protocol} = parseCapsForInnerDriver(BASE_CAPS, W3C_CAPS);
      desiredCaps.should.deep.equal(BASE_CAPS);
      processedJsonwpCapabilities.should.deep.equal(BASE_CAPS);
      processedW3CCapabilities.should.deep.equal(W3C_CAPS);
      protocol.should.equal('W3C');
    });
    it('should include default capabilities in results', function () {
      const defaultW3CCaps = {
        'appium:foo': 'bar',
        'appium:baz': 'bla',
      };
      const expectedDefaultCaps = {
        foo: 'bar',
        baz: 'bla',
      };
      const {
        desiredCaps,
        processedJsonwpCapabilities,
        processedW3CCapabilities
      } = parseCapsForInnerDriver(BASE_CAPS, W3C_CAPS, {}, defaultW3CCaps);
      desiredCaps.should.deep.equal({
        ...expectedDefaultCaps,
        ...BASE_CAPS,
      });
      processedJsonwpCapabilities.should.deep.equal({
        ...expectedDefaultCaps,
        ...BASE_CAPS
      });
      processedW3CCapabilities.alwaysMatch.should.deep.equal({
        ...insertAppiumPrefixes(expectedDefaultCaps),
        ...insertAppiumPrefixes(BASE_CAPS)
      });
    });
    it('should allow valid default capabilities', function () {
      const res = parseCapsForInnerDriver(null, W3C_CAPS, {}, {
        'appium:foo': 'bar2',
      });
      res.processedW3CCapabilities.alwaysMatch['appium:foo'].should.eql('bar2');
    });
    it('should not allow invalid default capabilities', function () {
      const res = parseCapsForInnerDriver(null, W3C_CAPS, {}, {
        foo: 'bar', 'appium:foo2': 'bar2',
      });
      res.error.should.eql({
        jsonwpCode: 61, error: 'invalid argument', w3cStatus: 400, _stacktrace: null
      });
    });
    it('should reject if W3C caps are not passing constraints', function () {
      const err = parseCapsForInnerDriver(undefined, W3C_CAPS, {hello: {presence: true}}).error;
      err.message.should.match(/'hello' can't be blank/);
      _.isError(err).should.be.true;

    });
    it('should only accept W3C caps that have passing constraints', function () {
      let w3cCaps = {
        ...W3C_CAPS,
        firstMatch: [
          {foo: 'bar'},
          {'appium:hello': 'world'},
        ],
      };
      parseCapsForInnerDriver(BASE_CAPS, w3cCaps, {hello: {presence: true}}).error.should.eql({
        jsonwpCode: 61, error: 'invalid argument', w3cStatus: 400, _stacktrace: null
      });
    });
    it('should add appium prefixes to W3C caps that are not standard in W3C', function () {
      parseCapsForInnerDriver(undefined, {
        alwaysMatch: {
          platformName: 'Fake',
          propertyName: 'PROP_NAME',
        },
      }).error.error.should.includes('invalid argument');
    });
  });

  describe('removeAppiumPrefixes()', function () {
    it('should remove appium prefixes from cap names', function () {
      removeAppiumPrefixes({
        'appium:cap1': 'value1',
        'ms:cap2': 'value2',
        someCap: 'someCap',
      }).should.eql({
        'cap1': 'value1',
        'ms:cap2': 'value2',
        someCap: 'someCap',
      });
    });
  });

  describe('insertAppiumPrefixes()', function () {
    it('should apply prefixes to non-standard capabilities', function () {
      insertAppiumPrefixes({
        someCap: 'someCap',
      }).should.deep.equal({
        'appium:someCap': 'someCap',
      });
    });
    it('should not apply prefixes to standard capabilities', function () {
      insertAppiumPrefixes({
        browserName: 'BrowserName',
        platformName: 'PlatformName',
      }).should.deep.equal({
        browserName: 'BrowserName',
        platformName: 'PlatformName',
      });
    });
    it('should not apply prefixes to capabilities that already have a prefix', function () {
      insertAppiumPrefixes({
        'appium:someCap': 'someCap',
        'moz:someOtherCap': 'someOtherCap',
      }).should.deep.equal({
        'appium:someCap': 'someCap',
        'moz:someOtherCap': 'someOtherCap',
      });
    });
    it('should apply prefixes to non-prefixed, non-standard capabilities; should not apply prefixes to any other capabilities', function () {
      insertAppiumPrefixes({
        'appium:someCap': 'someCap',
        'moz:someOtherCap': 'someOtherCap',
        browserName: 'BrowserName',
        platformName: 'PlatformName',
        someOtherCap: 'someOtherCap',
        yetAnotherCap: 'yetAnotherCap',
      }).should.deep.equal({
        'appium:someCap': 'someCap',
        'moz:someOtherCap': 'someOtherCap',
        browserName: 'BrowserName',
        platformName: 'PlatformName',
        'appium:someOtherCap': 'someOtherCap',
        'appium:yetAnotherCap': 'yetAnotherCap',
      });
    });
  });

  describe('pullSettings()', function () {
    it('should pull settings from caps', function () {
      const caps = {
        platformName: 'foo',
        browserName: 'bar',
        'settings[settingName]': 'baz',
        'settings[settingName2]': 'baz2',
      };
      const settings = pullSettings(caps);
      settings.should.eql({
        settingName: 'baz',
        settingName2: 'baz2',
      });
      caps.should.eql({
        platformName: 'foo',
        browserName: 'bar',
      });
    });
    it('should pull settings dict if object values are present in caps', function () {
      const caps = {
        platformName: 'foo',
        browserName: 'bar',
        'settings[settingName]': {key: 'baz'},
      };
      const settings = pullSettings(caps);
      settings.should.eql({
        settingName: {key: 'baz'},
      });
      caps.should.eql({
        platformName: 'foo',
        browserName: 'bar',
      });
    });
    it('should pull empty dict if no settings are present in caps', function () {
      const caps = {
        platformName: 'foo',
        browserName: 'bar',
        'setting[settingName]': 'baz',
      };
      const settings = pullSettings(caps);
      settings.should.eql({});
      caps.should.eql({
        platformName: 'foo',
        browserName: 'bar',
        'setting[settingName]': 'baz',
      });
    });
    it('should pull empty dict if caps are empty', function () {
      const caps = {};
      const settings = pullSettings(caps);
      settings.should.eql({});
      caps.should.eql({});
    });
  });
});
