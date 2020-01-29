import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  parseCapsForInnerDriver, insertAppiumPrefixes, pullSettings } from '../lib/utils';
import { BASE_CAPS, W3C_CAPS } from './helpers';
import _ from 'lodash';


const should = chai.should();
chai.use(chaiAsPromised);

describe('utils', function () {
  describe('parseCapsForInnerDriver()', function () {
    it('should return JSONWP caps unchanged if only JSONWP caps provided', function () {
      let {desiredCaps, processedJsonwpCapabilities, processedW3CCapabilities, protocol} = parseCapsForInnerDriver(BASE_CAPS);
      desiredCaps.should.deep.equal(BASE_CAPS);
      processedJsonwpCapabilities.should.deep.equal(BASE_CAPS);
      should.not.exist(processedW3CCapabilities);
      protocol.should.equal('MJSONWP');
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
      const defaultCaps = {
        foo: 'bar',
        baz: 'bla',
      };
      const {
        desiredCaps,
        processedJsonwpCapabilities,
        processedW3CCapabilities
      } = parseCapsForInnerDriver(BASE_CAPS, W3C_CAPS, {}, defaultCaps);
      desiredCaps.should.deep.equal({
        ...defaultCaps,
        ...BASE_CAPS,
      });
      processedJsonwpCapabilities.should.deep.equal({
        ...defaultCaps,
        ...BASE_CAPS
      });
      processedW3CCapabilities.alwaysMatch.should.deep.equal({
        ...insertAppiumPrefixes(defaultCaps),
        ...insertAppiumPrefixes(BASE_CAPS)
      });
    });
    it('should include default capabilities into incomplete W3C caps', function () {
      const defaultCaps = {
        foo: 'bar',
        baz: 'bla',
      };
      const {
        desiredCaps,
        processedJsonwpCapabilities,
        processedW3CCapabilities
      } = parseCapsForInnerDriver({}, {
        alwaysMatch: {},
      }, {}, defaultCaps);
      desiredCaps.should.deep.equal({
        ...defaultCaps,
      });
      processedJsonwpCapabilities.should.deep.equal(defaultCaps);
      processedW3CCapabilities.alwaysMatch.should.deep.equal(
        insertAppiumPrefixes(defaultCaps)
      );
    });
    it('should rewrite default capabilities in results', function () {
      const baseCapsWithDefault = Object.assign({}, BASE_CAPS, {
        foo: 'baz',
        'appium:foo2': 'baz2',
      });
      const w3cCapsWithDefault = _.cloneDeep(W3C_CAPS);
      w3cCapsWithDefault.alwaysMatch.foo = 'baz';
      w3cCapsWithDefault.alwaysMatch.foo2 = 'baz2';
      let {desiredCaps, processedJsonwpCapabilities, processedW3CCapabilities} = parseCapsForInnerDriver(baseCapsWithDefault, w3cCapsWithDefault, {}, {
        foo: 'bar',
        'appium:foo2': 'bar2',
      });
      desiredCaps.should.deep.equal({foo: 'baz', foo2: 'baz2', ...BASE_CAPS});
      processedJsonwpCapabilities.should.deep.equal({foo: 'baz', foo2: 'baz2', ...BASE_CAPS});
      processedW3CCapabilities.alwaysMatch.should.deep.equal({'appium:foo': 'baz', 'appium:foo2': 'baz2', ...insertAppiumPrefixes(BASE_CAPS)});
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
          {hello: 'world'},
        ],
      };
      let {desiredCaps, processedJsonwpCapabilities, processedW3CCapabilities, protocol} = parseCapsForInnerDriver(BASE_CAPS, w3cCaps, {hello: {presence: true}});
      const expectedResult = {hello: 'world', ...BASE_CAPS};
      desiredCaps.should.deep.equal(expectedResult);
      processedJsonwpCapabilities.should.deep.equal({...BASE_CAPS});
      processedW3CCapabilities.alwaysMatch.should.deep.equal(insertAppiumPrefixes(expectedResult));
      protocol.should.equal('W3C');
    });
    it('should add appium prefixes to W3C caps that are not standard in W3C', function () {
      parseCapsForInnerDriver(undefined, {
        alwaysMatch: {
          platformName: 'Fake',
          propertyName: 'PROP_NAME',
        },
      }).processedW3CCapabilities.should.deep.equal({
        alwaysMatch: {
          platformName: 'Fake',
          'appium:propertyName': 'PROP_NAME',
        },
        firstMatch: [{}],
      });
    });
    it('should merge extraneous MJSONWP caps into W3C', function () {
      let jsonwpCaps = {
        ...BASE_CAPS,
        automationName: 'Fake',
      };
      const {desiredCaps, processedJsonwpCapabilities, processedW3CCapabilities, protocol} = parseCapsForInnerDriver(jsonwpCaps, {
        alwaysMatch: {platformName: 'Fake', propertyName: 'PROP_NAME'},
      });

      // We expect a combo of jsonwp caps and w3c provided caps with `appium:` prefix for non-standard caps
      const expectedCaps = {};

      for (let [key, value] of _.toPairs(jsonwpCaps)) {
        if (key !== 'platformName') {
          expectedCaps[`appium:${key}`] = value;
        } else {
          expectedCaps[key] = value;
        }
      }
      expectedCaps['appium:propertyName'] = 'PROP_NAME';

      processedW3CCapabilities.alwaysMatch.should.eql(expectedCaps);
      desiredCaps.should.eql({
        ...jsonwpCaps,
        propertyName: 'PROP_NAME',
      });
      processedJsonwpCapabilities.should.eql(jsonwpCaps);
      protocol.should.equal('W3C');
    });
    it('should fix W3C caps by using MJSONWP if invalid W3C caps were provided', function () {
      let w3cCapabilities = {
        alwaysMatch: {platformName: 'Fake', propertyName: 'PROP_NAME'},
      };
      let constraints = {
        deviceName: {
          presence: true,
        }
      };
      const {desiredCaps, processedJsonwpCapabilities, processedW3CCapabilities, protocol} = parseCapsForInnerDriver({...BASE_CAPS}, w3cCapabilities, constraints);
      processedW3CCapabilities.should.exist;
      desiredCaps.should.eql({...BASE_CAPS, propertyName: 'PROP_NAME'});
      processedJsonwpCapabilities.should.eql(BASE_CAPS);
      protocol.should.equal('W3C');
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
