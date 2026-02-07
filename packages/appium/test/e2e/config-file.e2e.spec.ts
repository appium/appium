import {DRIVER_TYPE} from '../../lib/constants';
import {readConfigFile} from '../../lib/config-file';
import {finalizeSchema, registerSchema, resetSchema} from '../../lib/schema/schema';
import extSchema from '../fixtures/driver-schema';
import {resolveFixture} from '../helpers';
import _ from 'lodash';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {system} from '@appium/support';

const {expect} = chai;
chai.use(chaiAsPromised);

const resolveConfigFixture = _.partial(resolveFixture, 'config');

describe('config file behavior', function () {
  const GOOD_FILEPATH = resolveConfigFixture('appium-config-good.json');
  const BAD_NODECONFIG_FILEPATH = resolveConfigFixture('appium-config-bad-nodeconfig.json');
  const BAD_FILEPATH = resolveConfigFixture('appium-config-bad.json');
  const INVALID_JSON_FILEPATH = resolveConfigFixture('appium-config-invalid.json');
  const SECURITY_ARRAY_FILEPATH = resolveConfigFixture('appium-config-security-array.json');
  const SECURITY_DELIMITED_FILEPATH = resolveConfigFixture('appium-config-security-delimited.json');
  const SECURITY_PATH_FILEPATH = resolveConfigFixture('appium-config-security-path.json');
  const UNKNOWN_PROPS_FILEPATH = resolveConfigFixture('appium-config-ext-unknown-props.json');
  const EXT_PROPS_FILEPATH = resolveConfigFixture('appium-config-ext-good.json');
  const LOG_FILTERS_FILEPATH = resolveConfigFixture('appium-config-log-filters.json');

  beforeEach(function () {
    finalizeSchema();
  });

  afterEach(function () {
    resetSchema();
  });

  describe('when provided a path to a config file', function () {
    describe('when the config file is valid per the schema', function () {
      it('should return a valid config object', async function () {
        const result = await readConfigFile(GOOD_FILEPATH);
        expect(result).to.deep.equal({
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
              nodeconfig: {
                foo: 'bar',
              },
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

      describe('`server.nodeconfig` behavior', function () {
        describe('when a string', function () {
          it('should return errors', async function () {
            const result = await readConfigFile(BAD_NODECONFIG_FILEPATH);
            expect(result.errors?.[0]).to.have.property('instancePath', '/server/nodeconfig');
          });
        });

        describe('when an object', function () {
          it('should return a valid config object', async function () {
            const result = await readConfigFile(GOOD_FILEPATH);
            expect(result).to.have.property('errors').that.is.empty;
          });
        });
      });

      describe('`server.allow-insecure` behavior', function () {
        describe('when a string path', function () {
          it('should return errors', async function () {
            const result = await readConfigFile(SECURITY_PATH_FILEPATH);
            expect(result.errors?.[0]).to.have.property('instancePath', '/server/allow-insecure');
          });
        });

        describe('when a comma-delimited string', function () {
          it('should return errors', async function () {
            const result = await readConfigFile(SECURITY_DELIMITED_FILEPATH);
            expect(result.errors?.[0]).to.have.property('instancePath', '/server/allow-insecure');
          });
        });

        describe('when an array', function () {
          it('should return a valid config object', async function () {
            const result = await readConfigFile(SECURITY_ARRAY_FILEPATH);
            expect(result).to.deep.equal({
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
            expect(result).to.deep.equal({
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
          expect(result).to.have.deep.property('config', {
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
              nodeconfig: {},
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
          expect(result).to.have.property('filepath', BAD_FILEPATH);
          expect(result.errors).to.have.lengthOf(7);
          expect(result.errors).to.deep.include({
            instancePath: '',
            schemaPath: '#/additionalProperties',
            keyword: 'additionalProperties',
            params: {
              additionalProperty: 'appium-home',
            },
            message: 'must NOT have additional properties',
            isIdentifierLocation: true,
          });
          expect(result).to.have.property('reason').that.is.a('string');
        });
      });

      describe('with extensions', function () {
        let result: Awaited<ReturnType<typeof readConfigFile>>;

        beforeEach(function () {
          resetSchema();
          registerSchema(DRIVER_TYPE, 'fake', extSchema as Parameters<typeof registerSchema>[2]);
          finalizeSchema();
        });

        describe('when provided a config file with unknown properties', function () {
          beforeEach(async function () {
            result = await readConfigFile(UNKNOWN_PROPS_FILEPATH);
          });
          it('should return an object containing errors', function () {
            expect(result).to.have.deep.property('errors', [
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
            expect(result).to.have.deep.property('errors', []);
          });
        });
      });
    });

    describe('when the config file is invalid JSON', function () {
      it('should reject with a user-friendly error message', async function () {
        if (system.isWindows()) {
          return this.skip();
        }
        await expect(readConfigFile(INVALID_JSON_FILEPATH)).to.be.rejectedWith(
          new RegExp(`${_.escapeRegExp(INVALID_JSON_FILEPATH)}`)
        );
      });
    });
  });
});
