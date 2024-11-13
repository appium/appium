// @ts-check

import {DRIVER_TYPE} from '../../lib/constants';
import {readConfigFile} from '../../lib/config-file';
import {finalizeSchema, registerSchema, resetSchema} from '../../lib/schema/schema';
import extSchema from '../fixtures/driver-schema';
import {resolveFixture} from '../helpers';
import _ from 'lodash';
import {system} from '@appium/support';

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

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
  });

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
        result.should.deep.equal({
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
            result.should.have.nested.property('errors[0].instancePath', '/server/nodeconfig');
          });
        });

        describe('when an object', function () {
          it('should return a valid config object', async function () {
            const result = await readConfigFile(GOOD_FILEPATH);
            result.should.have.property('errors').that.is.empty;
          });
        });
      });

      describe('`server.allow-insecure` behavior', function () {
        describe('when a string path', function () {
          it('should return errors', async function () {
            const result = await readConfigFile(SECURITY_PATH_FILEPATH);
            result.should.have.nested.property('errors[0].instancePath', '/server/allow-insecure');
          });
        });

        describe('when a comma-delimited string', function () {
          it('should return errors', async function () {
            const result = await readConfigFile(SECURITY_DELIMITED_FILEPATH);
            result.should.have.nested.property('errors[0].instancePath', '/server/allow-insecure');
          });
        });

        describe('when an array', function () {
          it('should return a valid config object', async function () {
            const result = await readConfigFile(SECURITY_ARRAY_FILEPATH);
            result.should.deep.equal({
              config: {
                server: {
                  allowInsecure: ['foo', 'bar', 'baz'],
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
            result.should.deep.equal({
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
          result.should.have.deep.property('config', {
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
          result.should.have.property('filepath', BAD_FILEPATH);
          result.should.have.deep
            .property('errors')
            .that.contains.members([
              {
                instancePath: '',
                schemaPath: '#/additionalProperties',
                keyword: 'additionalProperties',
                params: {
                  additionalProperty: 'appium-home',
                },
                message: 'must NOT have additional properties',
                isIdentifierLocation: true,
              },
              {
                instancePath: '/server/allow-cors',
                schemaPath: '#/properties/server/properties/allow-cors/type',
                keyword: 'type',
                params: {
                  type: 'boolean',
                },
                message: 'must be boolean',
              },
              {
                instancePath: '/server/allow-insecure',
                schemaPath: '#/properties/server/properties/allow-insecure/type',
                keyword: 'type',
                params: {
                  type: 'array',
                },
                message: 'must be array',
              },
              {
                instancePath: '/server/callback-port',
                schemaPath: '#/properties/server/properties/callback-port/maximum',
                keyword: 'maximum',
                params: {
                  comparison: '<=',
                  limit: 65535,
                },
                message: 'must be <= 65535',
              },
              {
                instancePath: '/server/log-level',
                schemaPath: '#/properties/server/properties/log-level/enum',
                keyword: 'enum',
                params: {
                  allowedValues: [
                    'info',
                    'info:debug',
                    'info:info',
                    'info:warn',
                    'info:error',
                    'warn',
                    'warn:debug',
                    'warn:info',
                    'warn:warn',
                    'warn:error',
                    'error',
                    'error:debug',
                    'error:info',
                    'error:warn',
                    'error:error',
                    'debug',
                    'debug:debug',
                    'debug:info',
                    'debug:warn',
                    'debug:error',
                  ],
                },
                message: 'must be equal to one of the allowed values',
              },
              {
                instancePath: '/server/log-no-colors',
                schemaPath: '#/properties/server/properties/log-no-colors/type',
                keyword: 'type',
                params: {
                  type: 'boolean',
                },
                message: 'must be boolean',
              },
              {
                instancePath: '/server/port',
                schemaPath: '#/properties/server/properties/port/type',
                keyword: 'type',
                params: {
                  type: 'integer',
                },
                message: 'must be integer',
              },
            ])
            .and.lengthOf(7);

          result.should.have.property('reason').that.is.a.string;
        });
      });

      describe('with extensions', function () {
        /** @type {import('appium/lib/config-file').ReadConfigFileResult} */
        let result;

        beforeEach(function () {
          resetSchema();
          registerSchema(DRIVER_TYPE, 'fake', extSchema);
          finalizeSchema();
        });

        describe('when provided a config file with unknown properties', function () {
          beforeEach(async function () {
            result = await readConfigFile(UNKNOWN_PROPS_FILEPATH);
          });
          it('should return an object containing errors', function () {
            result.should.have.deep.property('errors', [
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
            result.should.have.deep.property('errors', []);
          });
        });
      });
    });

    describe('when the config file is invalid JSON', function () {
      it('should reject with a user-friendly error message', async function () {
        if (system.isWindows()) {
          // TODO figure out why this isn't working on windows
          return this.skip();
        }
        await readConfigFile(INVALID_JSON_FILEPATH).should.be.rejectedWith(
          new RegExp(`${_.escapeRegExp(INVALID_JSON_FILEPATH)}`)
        );
      });
    });
  });
});
