// @ts-check

import { readConfigFile } from '../lib/config-file';
import { finalizeSchema, registerSchema, resetSchema } from '../lib/schema/schema';
import extSchema from './fixtures/driver.schema.js';
import { resolveFixture } from './helpers';

describe('config file behavior', function () {
  const GOOD_FILEPATH = resolveFixture('config', 'appium.config.good.json');
  const BAD_NODECONFIG_FILEPATH = resolveFixture(
    'config',
    'appium.config.bad-nodeconfig.json',
  );
  const BAD_FILEPATH = resolveFixture('config', 'appium.config.bad.json');
  const INVALID_JSON_FILEPATH = resolveFixture(
    'config',
    'appium.config.invalid.json',
  );
  const SECURITY_ARRAY_FILEPATH = resolveFixture(
    'config',
    'appium.config.security-array.json',
  );
  const SECURITY_DELIMITED_FILEPATH = resolveFixture(
    'config',
    'appium.config.security-delimited.json',
  );
  const SECURITY_PATH_FILEPATH = resolveFixture(
    'config',
    'appium.config.security-path.json',
  );
  const UNKNOWN_PROPS_FILEPATH = resolveFixture(
    'config',
    'appium.config.ext-unknown-props.json',
  );
  const EXT_PROPS_FILEPATH = resolveFixture(
    'config',
    'appium.config.ext-good.json',
  );

  beforeEach(function () {
    finalizeSchema();
  });

  afterEach(function () {
    resetSchema();
  });

  describe('when provided a path to a config file', function () {
    describe('when the config file is valid per the schema', function () {
      it('should return a valid config object', async function () {
        const result = await readConfigFile(GOOD_FILEPATH, {
          normalize: false,
        });
        result.should.deep.equal({
          config: require(GOOD_FILEPATH),
          filepath: GOOD_FILEPATH,
          errors: [],
        });
      });

      describe('server.nodeconfig behavior', function () {
        describe('when a string', function () {
          it('should return errors', async function () {
            const result = await readConfigFile(BAD_NODECONFIG_FILEPATH, {
              normalize: false,
            });
            result.should.have.nested.property(
              'errors[0].instancePath',
              '/server/nodeconfig',
            );
          });
        });

        describe('when an object', function () {
          it('should return a valid config object', async function () {
            const result = await readConfigFile(GOOD_FILEPATH, {
              normalize: false,
            });
            result.should.have.property('errors').that.is.empty;
          });
        });
      });

      describe('server.allow-insecure behavior', function () {
        describe('when a string path', function () {
          it('should return errors', async function () {
            const result = await readConfigFile(SECURITY_PATH_FILEPATH, {
              normalize: false,
            });
            result.should.have.nested.property(
              'errors[0].instancePath',
              '/server/allow-insecure',
            );
          });
        });

        describe('when a comma-delimited string', function () {
          it('should return errors', async function () {
            const result = await readConfigFile(SECURITY_DELIMITED_FILEPATH, {
              normalize: false,
            });
            result.should.have.nested.property(
              'errors[0].instancePath',
              '/server/allow-insecure',
            );
          });
        });

        describe('when an array', function () {
          it('should return a valid config object', async function () {
            const result = await readConfigFile(SECURITY_ARRAY_FILEPATH, {
              normalize: false,
            });
            result.should.deep.equal({
              config: require(SECURITY_ARRAY_FILEPATH),
              filepath: SECURITY_ARRAY_FILEPATH,
              errors: [],
            });
          });
        });
      });
    });

    describe('when the config file is invalid per the schema', function () {
      describe('without extensions', function () {
        it('should return an object containing errors', async function () {
          const result = await readConfigFile(BAD_FILEPATH, {
            normalize: false,
          });
          result.should.have.deep.property('config', require(BAD_FILEPATH));
          result.should.have.property('filepath', BAD_FILEPATH);
          result.should.have.deep.property('errors').that.contains.members([
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
                type: 'array'
              },
              message: 'must be array',
            },
            {
              instancePath: '/server/callback-port',
              schemaPath:
                '#/properties/server/properties/callback-port/maximum',
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
          ]).and.lengthOf(7);

          result.should.have.property('reason').that.is.a.string;
        });
      });

      describe('with extensions', function () {
        /** @type {import('../lib/config-file').ReadConfigFileResult} */
        let result;

        beforeEach(function () {
          resetSchema();
          registerSchema('driver', 'fake', extSchema);
          finalizeSchema();
        });

        describe('when provided a config file with unknown properties', function () {
          beforeEach(async function () {
            result = await readConfigFile(UNKNOWN_PROPS_FILEPATH, {
              normalize: false,
            });
          });
          it('should return an object containing errors', function () {
            result.should.have.deep.property('errors', [
              {
                instancePath: '/server/driver/fake',
                schemaPath:
                  'driver-fake.json/additionalProperties',
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
            result = await readConfigFile(EXT_PROPS_FILEPATH, {
              normalize: false,
            });
          });
          it('should return an object containing no errors', function () {
            result.should.have.deep.property('errors', []);
          });
        });
      });
    });

    describe('when the config file is invalid JSON', function () {
      it('should reject with a user-friendly error message', async function () {
        await readConfigFile(INVALID_JSON_FILEPATH).should.be.rejectedWith(
          new RegExp(`${INVALID_JSON_FILEPATH} is invalid`),
        );
      });
    });
  });
});
