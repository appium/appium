import type {Constraints, W3CCapabilities} from '@appium/types';
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
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {createSandbox, type SinonSandbox, type SinonStub} from 'sinon';
import logger from '../../lib/logger';
import {fs} from '@appium/support';

describe('utils', function () {
  beforeEach(async function () {
    use(chaiAsPromised);
  });

  describe('parseCapsForInnerDriver()', function () {
    it('should return an error if only JSONWP provided', function () {
      const res = parseCapsForInnerDriver(BASE_CAPS as unknown as W3CCapabilities<Constraints>);
      expect('error' in res && res.error).to.be.ok;
      expect((res as {error: {message: string}}).error.message).to.match(/W3C/);
    });
    it('should return W3C caps unchanged if only W3C caps were provided', function () {
      const {desiredCaps, processedW3CCapabilities} =
        parseCapsForInnerDriver(W3C_CAPS);
      expect(desiredCaps).to.deep.equal(BASE_CAPS);
      expect(processedW3CCapabilities).to.deep.equal(W3C_CAPS);
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
      const {desiredCaps, processedW3CCapabilities} =
        parseCapsForInnerDriver(W3C_CAPS, {}, defaultW3CCaps);
      expect(desiredCaps).to.deep.equal({
        ...expectedDefaultCaps,
        ...BASE_CAPS,
      });
      expect(processedW3CCapabilities!.alwaysMatch).to.deep.equal({
        ...insertAppiumPrefixes(expectedDefaultCaps),
        ...insertAppiumPrefixes(BASE_CAPS),
      });
    });
    it('should allow valid default capabilities', function () {
      const res = parseCapsForInnerDriver(
        W3C_CAPS,
        {},
        {
          'appium:foo': 'bar2',
        }
      );
      expect(res.processedW3CCapabilities!.alwaysMatch!['appium:foo']).to.eql('bar2');
    });
    it('should not allow invalid default capabilities', function () {
      const res = parseCapsForInnerDriver(
        W3C_CAPS,
        {},
        {
          foo: 'bar',
          'appium:foo2': 'bar2',
        }
      );
      const errRes = res as unknown as {error: {jsonwpCode: number; error: string; w3cStatus: number}};
      expect(errRes.error.jsonwpCode).to.eql(61);
      expect(errRes.error.error).to.eql('invalid argument');
      expect(errRes.error.w3cStatus).to.eql(400);
    });
    it('should reject if W3C caps are not passing constraints', function () {
      const res = parseCapsForInnerDriver(W3C_CAPS, {hello: {presence: true}});
      const err = (res as {error?: Error}).error;
      expect(err!.message).to.match(/required/);
      expect(_.isError(err)).to.be.true;
    });
    it('should only accept W3C caps that have passing constraints', function () {
      const w3cCaps = {
        ...W3C_CAPS,
        firstMatch: [{foo: 'bar'}, {'appium:hello': 'world'}],
      };
      const res = parseCapsForInnerDriver(w3cCaps, {hello: {presence: true}});
      const error = (res as {error?: {jsonwpCode: number; error: string; w3cStatus: number}}).error;
      expect(error!.jsonwpCode).to.eql(61);
      expect(error!.error).to.eql('invalid argument');
      expect(error!.w3cStatus).to.eql(400);
    });
    it('should add appium prefixes to W3C caps that are not standard in W3C', function () {
      const res = parseCapsForInnerDriver({
        alwaysMatch: {
          platformName: 'Fake',
          propertyName: 'PROP_NAME',
        },
        firstMatch: [{}],
      } as unknown as W3CCapabilities<Constraints>);
      expect((res as {error?: {error: string}}).error!.error).to.includes('invalid argument');
    });
  });

  describe('removeAppiumPrefixes()', function () {
    it('should remove appium prefixes from cap names', function () {
      expect(
        removeAppiumPrefixes({
          'appium:cap1': 'value1',
          'ms:cap2': 'value2',
          someCap: 'someCap',
        })
      ).to.eql({
        cap1: 'value1',
        'ms:cap2': 'value2',
        someCap: 'someCap',
      });
    });
  });

  describe('insertAppiumPrefixes()', function () {
    it('should apply prefixes to non-standard capabilities', function () {
      expect(insertAppiumPrefixes({someCap: 'someCap'})).to.deep.equal({
        'appium:someCap': 'someCap',
      });
    });
    it('should not apply prefixes to standard capabilities', function () {
      expect(
        insertAppiumPrefixes({
          browserName: 'BrowserName',
          platformName: 'PlatformName',
        })
      ).to.deep.equal({
        browserName: 'BrowserName',
        platformName: 'PlatformName',
      });
    });
    it('should not apply prefixes to capabilities that already have a prefix', function () {
      expect(
        insertAppiumPrefixes({
          'appium:someCap': 'someCap',
          'moz:someOtherCap': 'someOtherCap',
        })
      ).to.deep.equal({
        'appium:someCap': 'someCap',
        'moz:someOtherCap': 'someOtherCap',
      });
    });
    it('should apply prefixes to non-prefixed, non-standard capabilities; should not apply prefixes to any other capabilities', function () {
      expect(
        insertAppiumPrefixes({
          'appium:someCap': 'someCap',
          'moz:someOtherCap': 'someOtherCap',
          browserName: 'BrowserName',
          platformName: 'PlatformName',
          someOtherCap: 'someOtherCap',
          yetAnotherCap: 'yetAnotherCap',
        })
      ).to.deep.equal({
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
      expect(settings).to.eql({
        settingName: 'baz',
        settingName2: 'baz2',
      });
      expect(caps).to.eql({
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
      expect(settings).to.eql({
        settingName: {key: 'baz'},
      });
      expect(caps).to.eql({
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
      expect(settings).to.eql({});
      expect(caps).to.eql({
        platformName: 'foo',
        browserName: 'bar',
        'setting[settingName]': 'baz',
      });
    });
    it('should pull empty dict if caps are empty', function () {
      const caps = {};
      const settings = pullSettings(caps);
      expect(settings).to.eql({});
      expect(caps).to.eql({});
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
      expect(settings).to.eql({
        foo: 'baz2',
        yolo: 'bar',
      });
      expect(caps).to.eql({
        platformName: 'foo',
        browserName: 'bar',
      });
    });
  });

  describe('inspect()', function () {
    let sandbox: SinonSandbox;

    beforeEach(function () {
      sandbox = createSandbox();
      sandbox.spy(logger, 'info');
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should log the result of inspecting a value', function () {
      inspect({foo: 'bar'});
      expect(
        stripColors((logger.info as SinonStub).firstCall.firstArg)
      ).to.match(/\{\s*\n*foo:\s'bar'\s*\n*\}/);
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
      await expect(fs.exists(process.env.NODE_PATH!)).to.eventually.be.true;
    });
  });

  describe('fetchInterfaces()', function () {
    it('should fetch interfaces for ipv4 only', async function () {
      expect(fetchInterfaces(4).length).to.be.greaterThan(0);
    });

    it('should fetch interfaces for ipv6 only', async function () {
      expect(fetchInterfaces(6).length).to.be.greaterThan(0);
    });

    it('should fetch interfaces for ipv4 and ipv6', async function () {
      expect(fetchInterfaces().length).to.be.greaterThan(0);
    });
  });
});
