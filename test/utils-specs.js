import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { parseCapsForInnerDriver, insertAppiumPrefixes } from '../lib/utils';
import { BASE_CAPS, W3C_CAPS } from './helpers';


const should = chai.should();
chai.use(chaiAsPromised);

describe('utils', function () {
  describe('parseCapsForInnerDriver()', () => {
    it('should return JSONWP caps unchanged if only JSONWP caps provided', function () {
      let {desiredCaps, processedJsonwpCaps, processedW3CCapabilities} = parseCapsForInnerDriver(BASE_CAPS);
      desiredCaps.should.deep.equal(BASE_CAPS);
      processedJsonwpCaps.should.deep.equal(BASE_CAPS);
      should.not.exist(processedW3CCapabilities);
    });
    it('should return W3C caps unchanged if only W3C caps were provided', function () {
      let {desiredCaps, processedJsonwpCaps, processedW3CCapabilities} = parseCapsForInnerDriver(undefined, W3C_CAPS);
      desiredCaps.should.deep.equal(BASE_CAPS);
      should.not.exist(processedJsonwpCaps);
      processedW3CCapabilities.should.deep.equal(W3C_CAPS);
    });
    it('should return JSONWP and W3C caps if both were provided', function () {
      let {desiredCaps, processedJsonwpCaps, processedW3CCapabilities} = parseCapsForInnerDriver(BASE_CAPS, W3C_CAPS);
      desiredCaps.should.deep.equal(BASE_CAPS);
      processedJsonwpCaps.should.deep.equal(BASE_CAPS);
      processedW3CCapabilities.should.deep.equal(W3C_CAPS);
    });
    it('should merge the capabilities together if some are different', function () {
      let jsonwpCaps = {
        ...BASE_CAPS,
        foo: 'bar',
      };
      let w3cCaps = {
        ...W3C_CAPS,
        alwaysMatch: {
          ...W3C_CAPS.alwaysMatch,
          'appium:hello': 'world',
        }
      };
      let {desiredCaps, processedJsonwpCaps, processedW3CCapabilities} = parseCapsForInnerDriver(jsonwpCaps, w3cCaps);

      let expectedCaps = {
        ...jsonwpCaps,
        'hello': 'world'
      };

      desiredCaps.should.deep.equal(expectedCaps);
      processedJsonwpCaps.should.deep.equal(expectedCaps);
      processedW3CCapabilities.should.deep.equal({
        alwaysMatch: {...insertAppiumPrefixes(expectedCaps)},
        firstMatch: [{}],
      });
    });
    it('should merge the capabilities together and give preference to W3C if some are matching', function () {
      // Add caps to JSONWP caps
      let jsonwpCaps = {
        foo: 'bar',
        ...BASE_CAPS,
      };

      // Add caps to W3C caps
      let w3cCaps = {
        alwaysMatch: {
          hello: 'world',
          foo: 'BAR',
          ...BASE_CAPS,
        },
        firstMatch: [{}],
      };

      // Expected result is that w3c caps override jsonwp caps
      let expectedDesiredCaps = {
        ...jsonwpCaps,
        ...w3cCaps.alwaysMatch,
      };

      let {desiredCaps, processedJsonwpCaps, processedW3CCapabilities} = parseCapsForInnerDriver(jsonwpCaps, w3cCaps);
      desiredCaps.foo.should.equal('BAR');
      desiredCaps.should.deep.equal(expectedDesiredCaps);
      processedJsonwpCaps.should.deep.equal(expectedDesiredCaps);
      processedW3CCapabilities.should.deep.equal({
        alwaysMatch: insertAppiumPrefixes(expectedDesiredCaps),
        firstMatch: [{}],
      });
    });
    it('should include default capabilities in results', function () {
      let {desiredCaps, processedJsonwpCaps, processedW3CCapabilities} = parseCapsForInnerDriver(BASE_CAPS, W3C_CAPS, {}, {foo: 'bar'});
      desiredCaps.should.deep.equal({foo: 'bar', ...BASE_CAPS});
      processedJsonwpCaps.should.deep.equal({foo: 'bar', ...BASE_CAPS});
      processedW3CCapabilities.alwaysMatch.should.deep.equal({'appium:foo': 'bar', ...insertAppiumPrefixes(BASE_CAPS)});
    });
    it('should reject if W3C caps are not passing constraints', function () {
      (() => parseCapsForInnerDriver(BASE_CAPS, W3C_CAPS, {hello: {presence: true}})).should.throw(/'hello' can't be blank/);
    });
    it('should only accept W3C caps that have passing constraints', function () {
      let w3cCaps = {
        ...W3C_CAPS,
        firstMatch: [
          {foo: 'bar'},
          {hello: 'world'},
        ],
      };
      let {desiredCaps, processedJsonwpCaps, processedW3CCapabilities} = parseCapsForInnerDriver(BASE_CAPS, w3cCaps, {hello: {presence: true}});
      const expectedResult = {hello: 'world', ...BASE_CAPS};
      desiredCaps.should.deep.equal(expectedResult);
      processedJsonwpCaps.should.deep.equal(expectedResult);
      processedW3CCapabilities.alwaysMatch.should.deep.equal(insertAppiumPrefixes(expectedResult));
    });
    it('should add appium prefixes to W3C caps that are not standard in W3C', function () {
      parseCapsForInnerDriver(undefined, {
        alwaysMatch: {platformName: 'Fake', propertyName: 'PROP_NAME'},
      }).processedW3CCapabilities.should.deep.equal({
        alwaysMatch: {
          platformName: 'Fake',
          'appium:propertyName': 'PROP_NAME',
        },
        firstMatch: [{}],
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
});