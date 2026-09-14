import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {BaseDriverCapConstraints, Capabilities, Constraints, NSCapabilities, W3CCapabilities} from '@appium/types';

import type {InvalidCaps} from '../../../lib/helpers/capability.js';
import {
  insertAppiumPrefixes,
  parseCapsForInnerDriver,
  pullSettings,
  removeAppiumPrefixes,
} from '../../../lib/helpers/capability.js';
import {BASE_CAPS, W3C_CAPS} from '../../helpers.js';

describe('helpers/capability', function () {
  describe('parseCapsForInnerDriver()', function () {
    it('should return an error if only JSONWP provided', function () {
      const res = parseCapsForInnerDriver(BASE_CAPS as unknown as W3CCapabilities<Constraints>) as InvalidCaps;
      assert.ok(res.error);
      assert.match(res.error.message, /W3C/);
    });
    it('should return W3C caps unchanged if only W3C caps were provided', function () {
      const {desiredCaps, processedW3CCapabilities} = parseCapsForInnerDriver(W3C_CAPS);
      assert.deepStrictEqual(desiredCaps, BASE_CAPS);
      assert.deepStrictEqual(processedW3CCapabilities, W3C_CAPS);
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
      const {desiredCaps, processedW3CCapabilities} = parseCapsForInnerDriver(W3C_CAPS, {}, defaultW3CCaps);
      assert.deepStrictEqual(desiredCaps, {
        ...expectedDefaultCaps,
        ...BASE_CAPS,
      });
      assert.deepStrictEqual(processedW3CCapabilities!.alwaysMatch, {
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
        },
      );
      assert.strictEqual((res.processedW3CCapabilities!.alwaysMatch as Record<string, unknown>)['appium:foo'], 'bar2');
    });
    it('should not allow invalid default capabilities', function () {
      const res = parseCapsForInnerDriver(
        W3C_CAPS,
        {},
        {
          foo: 'bar',
          'appium:foo2': 'bar2',
        },
      );
      const errRes = res as unknown as {
        error: {error: string; w3cStatus: number};
      };
      assert.strictEqual(errRes.error.error, 'invalid argument');
      assert.strictEqual(errRes.error.w3cStatus, 400);
    });
    it('should reject if W3C caps are not passing constraints', function () {
      const res = parseCapsForInnerDriver(W3C_CAPS as W3CCapabilities<{hello: {presence: true}}>, {
        hello: {presence: true},
      });
      const err = (res as {error?: Error}).error;
      assert.match(err!.message, /required/);
      assert.ok(err instanceof Error);
    });
    it('should only accept W3C caps that have passing constraints', function () {
      const w3cCaps = {
        ...W3C_CAPS,
        firstMatch: [{foo: 'bar'}, {'appium:hello': 'world'}],
      } as W3CCapabilities<{hello: {presence: true}}>;
      const res = parseCapsForInnerDriver(w3cCaps, {hello: {presence: true}});
      const error = (res as {error?: {error: string; w3cStatus: number}}).error;
      assert.strictEqual(error!.error, 'invalid argument');
      assert.strictEqual(error!.w3cStatus, 400);
    });
    it('should add appium prefixes to W3C caps that are not standard in W3C', function () {
      const res = parseCapsForInnerDriver({
        alwaysMatch: {
          platformName: 'Fake',
          propertyName: 'PROP_NAME',
        },
        firstMatch: [{}],
      } as unknown as W3CCapabilities<Constraints>);
      assert.ok((res as {error?: {error: string}}).error!.error.includes('invalid argument'));
    });
  });

  describe('removeAppiumPrefixes()', function () {
    it('should remove appium prefixes from cap names', function () {
      assert.deepStrictEqual(
        removeAppiumPrefixes({
          'appium:cap1': 'value1',
          'ms:cap2': 'value2',
          someCap: 'someCap',
        } as NSCapabilities<BaseDriverCapConstraints>),
        {
          cap1: 'value1',
          'ms:cap2': 'value2',
          someCap: 'someCap',
        },
      );
    });
  });

  describe('insertAppiumPrefixes()', function () {
    it('should apply prefixes to non-standard capabilities', function () {
      assert.deepStrictEqual(
        insertAppiumPrefixes({
          someCap: 'someCap',
        } as unknown as Capabilities<BaseDriverCapConstraints>),
        {
          'appium:someCap': 'someCap',
        },
      );
    });
    it('should not apply prefixes to standard capabilities', function () {
      assert.deepStrictEqual(
        insertAppiumPrefixes({
          browserName: 'BrowserName',
          platformName: 'PlatformName',
        } as unknown as Capabilities<BaseDriverCapConstraints>),
        {
          browserName: 'BrowserName',
          platformName: 'PlatformName',
        },
      );
    });
    it('should not apply prefixes to capabilities that already have a prefix', function () {
      assert.deepStrictEqual(
        insertAppiumPrefixes({
          'appium:someCap': 'someCap',
          'moz:someOtherCap': 'someOtherCap',
        } as unknown as Capabilities<BaseDriverCapConstraints>),
        {
          'appium:someCap': 'someCap',
          'moz:someOtherCap': 'someOtherCap',
        },
      );
    });
    it('should apply prefixes to non-prefixed, non-standard capabilities; should not apply prefixes to any other capabilities', function () {
      assert.deepStrictEqual(
        insertAppiumPrefixes({
          'appium:someCap': 'someCap',
          'moz:someOtherCap': 'someOtherCap',
          browserName: 'BrowserName',
          platformName: 'PlatformName',
          someOtherCap: 'someOtherCap',
          yetAnotherCap: 'yetAnotherCap',
        } as unknown as Capabilities<BaseDriverCapConstraints>),
        {
          'appium:someCap': 'someCap',
          'moz:someOtherCap': 'someOtherCap',
          browserName: 'BrowserName',
          platformName: 'PlatformName',
          'appium:someOtherCap': 'someOtherCap',
          'appium:yetAnotherCap': 'yetAnotherCap',
        },
      );
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
      assert.deepStrictEqual(settings, {
        settingName: 'baz',
        settingName2: 'baz2',
      });
      assert.deepStrictEqual(caps, {
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
      assert.deepStrictEqual(settings, {
        settingName: {key: 'baz'},
      });
      assert.deepStrictEqual(caps, {
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
      assert.deepStrictEqual(settings, {});
      assert.deepStrictEqual(caps, {
        platformName: 'foo',
        browserName: 'bar',
        'setting[settingName]': 'baz',
      });
    });
    it('should pull empty dict if caps are empty', function () {
      const caps = {};
      const settings = pullSettings(caps);
      assert.deepStrictEqual(settings, {});
      assert.deepStrictEqual(caps, {});
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
      assert.deepStrictEqual(settings, {
        foo: 'baz2',
        yolo: 'bar',
      });
      assert.deepStrictEqual(caps, {
        platformName: 'foo',
        browserName: 'bar',
      });
    });
  });
});
