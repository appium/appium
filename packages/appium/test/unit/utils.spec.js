import {
  parseCapsForInnerDriver,
  insertAppiumPrefixes,
  pullSettings,
  removeAppiumPrefixes,
  inspect,
  adjustNodePath,
  fetchInterfaces,
} from '../../lib/utils';
import {BASE_CAPS, W3C_CAPS} from '../helpers';
import _ from 'lodash';
import {stripColors} from '@colors/colors';
// eslint-disable-next-line import/named
import {createSandbox} from 'sinon';
import logger from '../../lib/logger';
import {fs} from '@appium/support';

describe('utils', function () {
  let should;

  beforeEach(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    should = chai.should();
  });

  describe('parseCapsForInnerDriver()', function () {
    it('should return an error if only JSONWP provided', function () {
      let {error, protocol} = parseCapsForInnerDriver(BASE_CAPS);
      protocol.should.equal('W3C');
      error.message.should.match(/W3C/);
    });
    it('should return W3C caps unchanged if only W3C caps were provided', function () {
      let {desiredCaps, processedJsonwpCapabilities, processedW3CCapabilities, protocol} =
        parseCapsForInnerDriver(undefined, W3C_CAPS);
      desiredCaps.should.deep.equal(BASE_CAPS);
      should.not.exist(processedJsonwpCapabilities);
      processedW3CCapabilities.should.deep.equal(W3C_CAPS);
      protocol.should.equal('W3C');
    });
    it('should return JSONWP and W3C caps if both were provided', function () {
      let {desiredCaps, processedJsonwpCapabilities, processedW3CCapabilities, protocol} =
        parseCapsForInnerDriver(BASE_CAPS, W3C_CAPS);
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
      const {desiredCaps, processedJsonwpCapabilities, processedW3CCapabilities} =
        parseCapsForInnerDriver(BASE_CAPS, W3C_CAPS, {}, defaultW3CCaps);
      desiredCaps.should.deep.equal({
        ...expectedDefaultCaps,
        ...BASE_CAPS,
      });
      processedJsonwpCapabilities.should.deep.equal({
        ...expectedDefaultCaps,
        ...BASE_CAPS,
      });
      processedW3CCapabilities.alwaysMatch.should.deep.equal({
        ...insertAppiumPrefixes(expectedDefaultCaps),
        ...insertAppiumPrefixes(BASE_CAPS),
      });
    });
    it('should allow valid default capabilities', function () {
      const res = parseCapsForInnerDriver(
        null,
        W3C_CAPS,
        {},
        {
          'appium:foo': 'bar2',
        }
      );
      res.processedW3CCapabilities.alwaysMatch['appium:foo'].should.eql('bar2');
    });
    it('should not allow invalid default capabilities', function () {
      const res = parseCapsForInnerDriver(
        null,
        W3C_CAPS,
        {},
        {
          foo: 'bar',
          'appium:foo2': 'bar2',
        }
      );
      res.error.jsonwpCode.should.eql(61);
      res.error.error.should.eql('invalid argument');
      res.error.w3cStatus.should.eql(400);
      _.isNull(res.error._stacktrace).should.be.true;
    });
    it('should reject if W3C caps are not passing constraints', function () {
      const err = parseCapsForInnerDriver(undefined, W3C_CAPS, {
        hello: {presence: true},
      }).error;
      err.message.should.match(/'hello' can't be blank/);
      _.isError(err).should.be.true;
    });
    it('should only accept W3C caps that have passing constraints', function () {
      let w3cCaps = {
        ...W3C_CAPS,
        firstMatch: [{foo: 'bar'}, {'appium:hello': 'world'}],
      };
      const error = parseCapsForInnerDriver(BASE_CAPS, w3cCaps, {
        hello: {presence: true},
      }).error;
      error.jsonwpCode.should.eql(61);
      error.error.should.eql('invalid argument');
      error.w3cStatus.should.eql(400);
      _.isNull(error._stacktrace).should.be.true;
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
        cap1: 'value1',
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
    it('should pull combined settings', function () {
      const caps = {
        platformName: 'foo',
        browserName: 'bar',
        'appium:settings[foo]': 'baz2',
        'appium:settings': {
          foo: 'baz',
          yolo: 'bar',
        },
      };
      const settings = pullSettings(caps);
      settings.should.eql({
        foo: 'baz2',
        yolo: 'bar',
      });
      caps.should.eql({
        platformName: 'foo',
        browserName: 'bar',
      });
    });
  });

  describe('inspect()', function () {
    /**
     * @type {sinon.SinonSandbox}
     */
    let sandbox;
    beforeEach(function () {
      sandbox = createSandbox();
      sandbox.spy(logger, 'info');
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should log the result of inspecting a value', function () {
      inspect({foo: 'bar'});
      stripColors(/** @type {sinon.SinonStub} */ (logger.info).firstCall.firstArg).should.match(
        /\{\s*\n*foo:\s'bar'\s*\n*\}/
      );
    });
  });

  describe('adjustNodePath()', function () {
    const prevValue = process.env.NODE_PATH;

    beforeEach(function () {
      if (process.env.NODE_PATH) {
        delete process.env.NODE_PATH;
      }
    });

    afterEach(function () {
      if (prevValue) {
        process.env.NODE_PATH = prevValue;
      }
    });

    it('should adjust NODE_PATH', async function () {
      adjustNodePath();
      (await fs.exists(process.env.NODE_PATH)).should.be.true;
    });
  });

  describe('fetchInterfaces()', function () {
    it('should fetch interfaces for ipv4 only', async function () {
      fetchInterfaces(4).length.should.be.greaterThan(0);
    });

    it('should fetch interfaces for ipv6 only', async function () {
      fetchInterfaces(6).length.should.be.greaterThan(0);
    });

    it('should fetch interfaces for ipv4 and ipv6', async function () {
      fetchInterfaces().length.should.be.greaterThan(0);
    });
  });

});
