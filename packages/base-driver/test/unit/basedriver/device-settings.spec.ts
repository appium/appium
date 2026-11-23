import assert from 'node:assert/strict';
import {afterEach, beforeEach, describe, it, type TestContext} from 'node:test';

import * as support from '@appium/support';
import type {SettingsUpdateListener} from '@appium/types';
import sinon from 'sinon';

import {DeviceSettings, MAX_SETTINGS_SIZE} from '../../../lib/basedriver/device-settings.js';

let importCounter = 0;

describe('DeviceSettings', function () {
  let sandbox: sinon.SinonSandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('constructor', function () {
    describe('when no parameters are provided to the constructor', function () {
      it('should not throw', function () {
        assert.doesNotThrow(() => new DeviceSettings());
      });
    });

    it('should not hold on to reference of defaults in constructor', function () {
      const obj = {foo: 'bar'};
      const d1 = new DeviceSettings(obj);
      const d2 = new DeviceSettings(obj);
      d1.getSettings().foo = 'baz';
      assert.notDeepStrictEqual(d1.getSettings(), d2.getSettings());
    });
  });

  describe('instance method', function () {
    describe('getSettings()', function () {
      it('should return a clone of the internal settings object', function () {
        const settings = {
          foo: 'bar',
          bar: 'foo',
        };
        const deviceSettings = new DeviceSettings(settings);
        assert.deepStrictEqual(deviceSettings.getSettings(), settings);
      });
    });

    describe('update()', function () {
      describe('when no parameters are provided', function () {
        it('should reject with an InvalidArgumentError', async function () {
          const deviceSettings = new DeviceSettings();
          await assert.rejects((deviceSettings.update as (newSettings?: Record<string, unknown>) => Promise<void>)(), {
            name: 'InvalidArgumentError',
            message: /with valid JSON/i,
          });
        });
      });

      describe('when a non-plain-object `newSettings` param is provided', function () {
        it('should reject with an InvalidArgumentError', async function () {
          const deviceSettings = new DeviceSettings();
          await assert.rejects(deviceSettings.update(null as unknown as Record<string, unknown>), {
            name: 'InvalidArgumentError',
            message: /with valid JSON/i,
          });
        });
      });

      describe('when the size of the `newSettings` param exceeds `MAX_SETTINGS_SIZE`', function () {
        it('should reject with an InvalidArgumentError', async function (t) {
          // `@appium/support`'s `node` export is an ES module namespace object
          // (frozen), so sinon can't stub `node.getObjectSize` on it directly. Mock
          // the whole `@appium/support` module instead and re-import device-settings.js
          // fresh so it re-links against the mock.
          //
          // `default` is destructured out of the spread: on Node 22, passing a `default`
          // key through `namedExports` (rather than the dedicated `defaultExport` option)
          // makes `mock.module()` generate invalid synthetic module source
          // (`SyntaxError: Unexpected token 'default'`); nothing here needs the default
          // export anyway.
          const {default: _unusedDefault, ...supportWithoutDefault} = support;
          (t as TestContext).mock.module('@appium/support', {
            namedExports: {
              ...supportWithoutDefault,
              node: {...support.node, getObjectSize: () => MAX_SETTINGS_SIZE + 1},
            },
          });
          const {DeviceSettings: MockedDeviceSettings} = await import(
            `../../../lib/basedriver/device-settings.js?t=${importCounter++}`
          );
          const deviceSettings = new MockedDeviceSettings();
          await assert.rejects(deviceSettings.update({stuff: 'things'}), {
            name: 'InvalidArgumentError',
            message: /object size exceeds/i,
          });
        });
      });

      describe('when the `newSettings` param is valid', function () {
        let onSettingsUpdate: sinon.SinonStub;

        beforeEach(function () {
          onSettingsUpdate = sandbox.stub();
        });

        describe('when the new settings do not differ', function () {
          it('should not call the `_onSettingsUpdate` listener', async function () {
            const deviceSettings = new DeviceSettings(
              {stuff: 'things'},
              onSettingsUpdate as SettingsUpdateListener<Record<string, unknown>>,
            );
            await deviceSettings.update({stuff: 'things'});
            assert.strictEqual(onSettingsUpdate.called, false);
          });
        });

        describe('when the new settings differ', function () {
          it('should call the `_onSettingsUpdate` listener', async function () {
            const deviceSettings = new DeviceSettings(
              {},
              onSettingsUpdate as SettingsUpdateListener<Record<string, unknown>>,
            );
            await deviceSettings.update({stuff: 'things'});
            assert.strictEqual(onSettingsUpdate.calledOnceWithExactly('stuff', 'things', undefined), true);
          });
        });

        describe('when the new settings contain the `__proto__` key', function () {
          it('should reject with an InvalidArgumentError', async function () {
            const deviceSettings = new DeviceSettings();
            const newSettings = JSON.parse('{"__proto__": {"polluted": true}}');
            await assert.rejects(deviceSettings.update(newSettings), {
              name: 'InvalidArgumentError',
              message: /__proto__/,
            });
          });

          it('should apply nothing from a mixed payload', async function () {
            const deviceSettings = new DeviceSettings(
              {},
              onSettingsUpdate as SettingsUpdateListener<Record<string, unknown>>,
            );
            const newSettings = JSON.parse('{"foo": 1, "__proto__": {"polluted": true}}');
            await assert.rejects(deviceSettings.update(newSettings), {name: 'InvalidArgumentError'});
            assert.strictEqual(onSettingsUpdate.called, false);
            assert.deepStrictEqual(deviceSettings.getSettings(), {});
          });

          it('should keep the prototype of the settings object intact', async function () {
            const deviceSettings = new DeviceSettings();
            const newSettings = JSON.parse('{"__proto__": {"polluted": true}}');
            await assert.rejects(deviceSettings.update(newSettings), {name: 'InvalidArgumentError'});
            assert.strictEqual(Object.getPrototypeOf(deviceSettings.getSettings()), Object.prototype);
          });
        });

        describe('when the new settings use other reserved-looking keys', function () {
          it('should accept `constructor` and `prototype` as plain data keys', async function () {
            const deviceSettings = new DeviceSettings(
              {},
              onSettingsUpdate as SettingsUpdateListener<Record<string, unknown>>,
            );
            await deviceSettings.update(
              JSON.parse('{"constructor": "x", "prototype": "y"}') as Record<string, unknown>,
            );
            assert.deepStrictEqual(deviceSettings.getSettings(), {constructor: 'x', prototype: 'y'});
            assert.strictEqual(onSettingsUpdate.callCount, 2);
          });
        });
      });
    });
  });
});
