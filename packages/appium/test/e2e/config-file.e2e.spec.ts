import assert from 'node:assert/strict';
import {describe, it, afterEach, beforeEach, type TestContext} from 'node:test';

import {system, util} from '@appium/support';

import {readConfigFile} from '../../lib/bootstrap/config-file.js';
import {DRIVER_TYPE} from '../../lib/constants.js';
import {finalizeSchema, registerSchema, resetSchema} from '../../lib/schema/schema.js';
import extSchema from '../fixtures/driver-schema.js';
import {resolveFixture} from '../helpers.js';

const resolveConfigFixture = (name: string) => resolveFixture('config', name);

describe('config file behavior', function () {
  const GOOD_FILEPATH = resolveConfigFixture('appium-config-good.json');
  const BAD_FILEPATH = resolveConfigFixture('appium-config-bad.json');
  const INVALID_JSON_FILEPATH = resolveConfigFixture('appium-config-invalid.json');
  const SECURITY_ARRAY_FILEPATH = resolveConfigFixture('appium-config-security-array.json');
  const SECURITY_DELIMITED_FILEPATH = resolveConfigFixture('appium-config-security-delimited.json');
  const SECURITY_PATH_FILEPATH = resolveConfigFixture('appium-config-security-path.json');
  const UNKNOWN_PROPS_FILEPATH = resolveConfigFixture('appium-config-ext-unknown-props.json');
  const EXT_PROPS_FILEPATH = resolveConfigFixture('appium-config-ext-good.json');
  const LOG_FILTERS_FILEPATH = resolveConfigFixture('appium-config-log-filters.json');

  beforeEach(async function () {
    await finalizeSchema();
  });

  afterEach(function () {
    resetSchema();
  });

  describe('when provided a path to a config file', function () {
    describe('when the config file is valid per the schema', function () {
      it('should return a valid config object', async function () {
        const result = await readConfigFile(GOOD_FILEPATH);
        assert.deepStrictEqual(result, {
          config: {
            server: {
              address: '0.0.0.0',
              allowCors: false,
              allowInsecure: [],
              basePath: '/',
              callbackAddress: '0.0.0.0',
              callbackPort: 31337,
              debugLogSpacing: false,
              defaultCapabilities: {},
              denyInsecure: [],
              keepAliveTimeout: 600,
              localTimezone: false,
              logFile: '/tmp/appium.log',
              loglevel: 'info',
              logNoColors: false,
              logTimestamp: false,
              longStacktrace: false,
              noPermsCheck: false,
              port: 31337,
              relaxedSecurityEnabled: true,
              sessionOverride: false,
              strictCaps: false,
              tmpDir: '/tmp',
              traceDir: '/tmp/appium-instruments',
              useDrivers: [],
              usePlugins: ['all'],
              webhook: 'http://0.0.0.0/hook',
            },
          },
          filepath: GOOD_FILEPATH,
          errors: [],
        });
      });

      describe('`server.allow-insecure` behavior', function () {
        describe('when a string path', function () {
          it('should return errors', async function () {
            const result = await readConfigFile(SECURITY_PATH_FILEPATH);
            assert.strictEqual(result.errors?.[0]?.instancePath, '/server/allow-insecure');
          });
        });

        describe('when a comma-delimited string', function () {
          it('should return errors', async function () {
            const result = await readConfigFile(SECURITY_DELIMITED_FILEPATH);
            assert.strictEqual(result.errors?.[0]?.instancePath, '/server/allow-insecure');
          });
        });

        describe('when an array', function () {
          it('should return a valid config object', async function () {
            const result = await readConfigFile(SECURITY_ARRAY_FILEPATH);
            assert.deepStrictEqual(result, {
              config: {
                server: {
                  allowInsecure: ['*:foo', '*:bar', '*:baz'],
                },
              },
              filepath: SECURITY_ARRAY_FILEPATH,
              errors: [],
            });
          });
        });
      });

      describe('`server.log-filters` behavior', function () {
        describe('when the log filters are valid', function () {
          it('should return a valid config object', async function () {
            const result = await readConfigFile(LOG_FILTERS_FILEPATH);
            assert.deepStrictEqual(result, {
              config: {
                server: {
                  logFilters: [
                    {text: 'foo', replacer: 'bar'},
                    {pattern: '/foo/', flags: 'i'},
                  ],
                },
              },
              filepath: LOG_FILTERS_FILEPATH,
              errors: [],
            });
          });
        });
      });
    });

    describe('when the config file is invalid per the schema', function () {
      describe('without extensions', function () {
        it('should return an object containing errors', async function () {
          const result = await readConfigFile(BAD_FILEPATH);
          assert.deepStrictEqual(result.config, {
            appiumHome: 'foo',
            server: {
              address: '0.0.0.0',
              allowCors: 1,
              allowInsecure: {},
              basePath: '/',
              callbackAddress: '0.0.0.0',
              callbackPort: 43243234,
              debugLogSpacing: false,
              defaultCapabilities: {},
              denyInsecure: [],
              keepAliveTimeout: 0,
              localTimezone: false,
              logFile: '/tmp/appium.log',
              loglevel: 'smoosh',
              logNoColors: 1,
              logTimestamp: false,
              longStacktrace: false,
              noPermsCheck: false,
              port: '31337',
              relaxedSecurityEnabled: false,
              sessionOverride: false,
              strictCaps: false,
              tmpDir: '/tmp',
              traceDir: '/tmp/appium-instruments',
              useDrivers: [],
              usePlugins: ['all'],
              webhook: 'http://0.0.0.0/hook',
            },
          });
          assert.strictEqual(result.filepath, BAD_FILEPATH);
          assert.strictEqual(result.errors?.length, 7);
          assert.ok(
            result.errors?.some((error) =>
              util.isEqual(error, {
                instancePath: '',
                schemaPath: '#/additionalProperties',
                keyword: 'additionalProperties',
                params: {
                  additionalProperty: 'appium-home',
                },
                message: 'must NOT have additional properties',
                isIdentifierLocation: true,
              }),
            ),
          );
          assert.strictEqual(typeof result.reason, 'string');
        });
      });

      describe('with extensions', function () {
        let result: Awaited<ReturnType<typeof readConfigFile>>;

        beforeEach(async function () {
          resetSchema();
          await registerSchema(DRIVER_TYPE, 'fake', extSchema as Parameters<typeof registerSchema>[2]);
          await finalizeSchema();
        });

        describe('when provided a config file with unknown properties', function () {
          beforeEach(async function () {
            result = await readConfigFile(UNKNOWN_PROPS_FILEPATH);
          });
          it('should return an object containing errors', function () {
            assert.deepStrictEqual(result.errors, [
              {
                instancePath: '/server/driver/fake',
                schemaPath: 'driver-fake.json/additionalProperties',
                keyword: 'additionalProperties',
                params: {additionalProperty: 'bubb'},
                message: 'must NOT have additional properties',
                isIdentifierLocation: true,
              },
            ]);
          });
        });

        describe('when provided a config file with valid properties', function () {
          beforeEach(async function () {
            result = await readConfigFile(EXT_PROPS_FILEPATH);
          });
          it('should return an object containing no errors', function () {
            assert.deepStrictEqual(result.errors, []);
          });
        });
      });
    });

    describe('when the config file is invalid JSON', function () {
      it('should reject with a user-friendly error message', async function (ctx: TestContext) {
        if (system.isWindows()) {
          return ctx.skip();
        }
        await assert.rejects(
          readConfigFile(INVALID_JSON_FILEPATH),
          new RegExp(`${util.escapeRegExp(INVALID_JSON_FILEPATH)}`),
        );
      });
    });
  });
});
