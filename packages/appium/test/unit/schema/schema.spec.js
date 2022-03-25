// @ts-check

import _ from 'lodash';
import { createSandbox } from 'sinon';
import { DRIVER_TYPE, PLUGIN_TYPE } from '../../../lib/constants';
import appiumConfigSchema from '../../../lib/schema/appium-config-schema';
import { APPIUM_CONFIG_SCHEMA_ID } from '../../../lib/schema/arg-spec';
import defaultArgsFixture from '../../fixtures/default-args';
import DRIVER_SCHEMA_FIXTURE from '../../fixtures/driver.schema';
import flattenedSchemaFixture from '../../fixtures/flattened-schema';
import { rewiremock } from '../../helpers';

const {expect} = chai;

describe('schema', function () {
  /** @type {sinon.SinonSandbox} */
  let sandbox;

  /**
   * @type {import('@appium/types').Class<import('../../../lib/schema/schema').SchemaFinalizationError>}
   */
  let SchemaFinalizationError;

  /**
   * @type {import('@appium/types').Class<import('../../../lib/schema/schema').SchemaUnknownSchemaError>}
   */
  let SchemaUnknownSchemaError;

  /**
   * @type {import('@appium/types').Class<import('../../../lib/schema/schema').SchemaUnsupportedSchemaError>}
   */
  let SchemaUnsupportedSchemaError;

  /**
   * @type {import('../../../lib/schema/schema').resetSchema}
   */
  let resetSchema;

  /**
   * @type {import('../../../lib/schema/schema').registerSchema}
   */
  let registerSchema;

  /**
   * @type {import('../../../lib/schema/schema').getSchema}
   */
  let getSchema;

  /**
   * @type {import('../../../lib/schema/schema').finalizeSchema}
   */
  let finalizeSchema;

  /**
   * @type {import('../../../lib/schema/schema').getDefaultsForSchema}
   */
  let getDefaultsForSchema;

  /**
   * @type {import('../../../lib/schema/schema').flattenSchema}
   */
  let flattenSchema;

  /**
   * @type {import('../../../lib/schema/schema').isFinalized}
   */
  let isFinalized;

  /**
   * @type {import('../../../lib/schema/schema').validate}
   */
  let validate;

  let mocks;

  /**
   * @type {import('@appium/types').Class<import('../../../lib/schema/schema').RoachHotelMap>}
   */
  let RoachHotelMap;

  beforeEach(function () {
    sandbox = createSandbox();

    mocks = {
      'resolve-from': sandbox.stub(),
      '@sidvind/better-ajv-errors': sandbox.stub(),
    };

    ({
      SchemaFinalizationError,
      SchemaUnknownSchemaError,
      SchemaUnsupportedSchemaError,
      RoachHotelMap,
      resetSchema,
      registerSchema,
      registerSchema,
      getSchema,
      isFinalized,
      finalizeSchema,
      getDefaultsForSchema,
      flattenSchema,
      validate
    } = rewiremock.proxy(() => require('../../../lib/schema/schema'), mocks));
    resetSchema();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('registerSchema()', function () {
    describe('error conditions', function () {
      describe('when provided no parameters', function () {
        it('should throw a TypeError', function () {
          expect(() => {
            // @ts-expect-error
            registerSchema();
          }).to.throw(TypeError, /expected extension type/i);
        });
      });

      describe('when provided `type` and `name`, but not `schema`', function () {
        it('should throw a TypeError', function () {
          expect(() =>
            // @ts-expect-error
            registerSchema(DRIVER_TYPE, 'whoopeee'),
          ).to.throw(TypeError, /expected extension type/i);
        });
      });

      describe('when provided `type` and nonempty `schema`, but no `name`', function () {
        it('should throw a TypeError', function () {
          expect(() =>
            registerSchema(DRIVER_TYPE, undefined, {
              title: 'whoopeee',
            }),
          ).to.throw(TypeError, /expected extension type/i);
        });
      });

      describe('when the schema is of an unsupported type', function () {
        describe('when schema is a object but not a plain object', function () {
          it('should throw', function () {
            expect(() => {
              // @ts-expect-error
              registerSchema(DRIVER_TYPE, 'whoopeee', [45]);
            }).to.throw(
              SchemaUnsupportedSchemaError,
              /must be a plain object/i,
            );
          });
        });

        describe('when the schema is async', function () {
          it('should throw', function () {
            expect(() => {
              // @ts-expect-error
              registerSchema(DRIVER_TYPE, 'whoopee', {$async: true});
            }).to.throw(
              SchemaUnsupportedSchemaError,
              /cannot be an async schema/i,
            );
          });
        });

        describe('when the schema is boolean', function () {
          it('should throw', function () {
            expect(() => {
              // @ts-expect-error
              registerSchema(DRIVER_TYPE, 'whoopee', true);
            }).to.throw(SchemaUnsupportedSchemaError);
          });
        });
      });

      describe('when schema previously registered', function () {
        describe('when the schema is identical', function () {
          it('should not throw', function () {
            const schemaObject = {title: 'whoopee'};
            registerSchema(DRIVER_TYPE, 'whoopee', schemaObject);
            expect(() =>
              registerSchema(DRIVER_TYPE, 'whoopee', schemaObject),
            ).not.to.throw();
          });
        });

        describe('when the schema is different', function () {
          it('should throw', function () {
            const schemaObject = {title: 'whoopee'};
            registerSchema(DRIVER_TYPE, 'whoopee', schemaObject);
            expect(() =>
              registerSchema(DRIVER_TYPE, 'whoopee', {
                title: 'cushion?',
              }),
            ).to.throw(Error, /conflicts with an existing schema/);
          });
        });
      });
    });

    describe('when provided a nonempty `type`, `schema` and `name`', function () {
      it('should register the schema', function () {
        const schemaObject = {title: 'whoopee'};
        expect(() =>
          registerSchema(DRIVER_TYPE, 'whoopee', schemaObject),
        ).not.to.throw();
      });

      describe('when the `name` is not unique but `type` is', function () {
        it('should register both', function () {
          const schema1 = {title: 'pro-skub'};
          const schema2 = {title: 'anti-skub'};
          registerSchema(DRIVER_TYPE, 'skub', schema1);
          expect(() =>
            registerSchema(PLUGIN_TYPE, 'skub', schema2),
          ).not.to.throw();
        });
      });
    });
  });

  describe('getSchema()', function () {
    describe('when schema not yet compiled', function () {
      it('should throw', function () {
        expect(() => getSchema()).to.throw(SchemaFinalizationError);
      });
    });

    describe('when schema already compiled', function () {
      beforeEach(function () {
        finalizeSchema();
      });

      it('should return a schema', function () {
        expect(getSchema()).to.eql(appiumConfigSchema);
      });
    });

    describe('when schema already compiled and provided a schema ID', function () {
      beforeEach(function () {
        finalizeSchema();
      });

      describe('when schema ID is the base schema ID', function () {
        it('should return the base schema', function () {
          expect(getSchema(APPIUM_CONFIG_SCHEMA_ID)).to.eql(
            appiumConfigSchema,
          );
        });
      });

      describe('when the schema ID is a reference', function () {
        it('should return the schema for the reference', function () {
          expect(
            getSchema(
              `${APPIUM_CONFIG_SCHEMA_ID}#/properties/server/properties/address`,
            ),
          ).to.exist.and.to.eql(
            appiumConfigSchema.properties.server.properties.address,
          );
        });
      });

      describe('when schema ID is invalid', function () {
        it('should throw', function () {
          expect(() => getSchema('schema-the-clown')).to.throw(
            SchemaUnknownSchemaError,
          );
        });
      });
    });

    describe('when schema already compiled including an extension', function () {
      beforeEach(function () {
        registerSchema(DRIVER_TYPE, 'stuff', DRIVER_SCHEMA_FIXTURE);
        finalizeSchema();
      });

      it('should return the extension schema', function () {
        expect(getSchema('driver-stuff.json')).to.eql(
          DRIVER_SCHEMA_FIXTURE,
        );
      });
    });
  });

  describe('getDefaultsForSchema()', function () {
    describe('when schema not yet compiled', function () {
      it('should throw', function () {
        expect(() => getDefaultsForSchema()).to.throw(
          SchemaFinalizationError,
        );
      });
    });

    describe('when schema already compiled', function () {
      it('should return a Record object with only defined default values', function () {
        finalizeSchema();
        const defaults = getDefaultsForSchema();
        expect(defaults).to.eql(defaultArgsFixture);
      });

      describe('when extension schemas include defaults', function () {
        it('should return a Record object containing defaults for the extensions', function () {
          registerSchema(DRIVER_TYPE, 'stuff', DRIVER_SCHEMA_FIXTURE);
          finalizeSchema();
          const defaults = getDefaultsForSchema();
          // extensions have a key that looks like a keypath. we may want to change that
          expect(defaults).to.have.property('driver.stuff.answer', 50);
        });
      });
    });
  });

  describe('flattenSchema()', function () {
    describe('when schema not yet compiled', function () {
      it('should throw', function () {
        expect(() => flattenSchema()).to.throw(SchemaFinalizationError);
      });
    });

    describe('when schema compiled', function () {
      beforeEach(function () {
        resetSchema();
        finalizeSchema();
      });

      it('should flatten a schema', function () {
        expect(flattenSchema()).to.eql(flattenedSchemaFixture);
      });
    });

    describe('when extensions provide schemas', function () {
      let expected;

      beforeEach(function () {
        registerSchema(
          DRIVER_TYPE,
          'fake',
          // TS complains about this require()
          // @ts-ignore
          require('@appium/fake-driver/build/lib/fake-driver-schema').default,
        );
        finalizeSchema();

        // these props would be added by the fake-driver extension
        expected = [
          ...flattenedSchemaFixture,
          {
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 65535,
              description: 'The port to use for the fake web server',
            },
            argSpec: {
              name: 'silly-web-server-port',
              extType: DRIVER_TYPE,
              extName: 'fake',
              ref: 'driver-fake.json#/properties/silly-web-server-port',
              arg: 'driver-fake-silly-web-server-port',
              dest: 'driver.fake.sillyWebServerPort',
              rawDest: 'sillyWebServerPort',
              defaultValue: undefined,
            },
          },
          {
            schema: {
              type: 'string',
              description: 'The host to use for the fake web server',
              default: 'sillyhost',
            },
            argSpec: {
              name: 'sillyWebServerHost',
              extType: DRIVER_TYPE,
              extName: 'fake',
              ref: 'driver-fake.json#/properties/sillyWebServerHost',
              arg: 'driver-fake-silly-web-server-host',
              dest: 'driver.fake.sillyWebServerHost',
              rawDest: 'sillyWebServerHost',
              defaultValue: 'sillyhost',
            },
          },
        ];
      });

      it('should flatten a schema', function () {
        expect(flattenSchema()).to.eql(expected);
      });
    });
  });

  describe('finalizeSchema()', function () {
    describe('when no extensions registered schemas', function () {
      it('should return a Record containing the single base schema', function () {
        expect(finalizeSchema()).to.eql({
          [APPIUM_CONFIG_SCHEMA_ID]: appiumConfigSchema,
        });
      });
    });

    describe('when extensions register schemas', function () {
      beforeEach(function () {
        registerSchema(DRIVER_TYPE, 'stuff', DRIVER_SCHEMA_FIXTURE);
      });

      it('should return a Record containing all extension schemas _and_ the base schema containing references to the extension schemas', function () {
        const baseSchemaWithRefs = _.cloneDeep(appiumConfigSchema);
        baseSchemaWithRefs.properties.server.properties.driver.properties.stuff =
          {$ref: 'driver-stuff.json', $comment: 'stuff'};
        expect(finalizeSchema()).to.eql({
          [APPIUM_CONFIG_SCHEMA_ID]: baseSchemaWithRefs,
          'driver-stuff.json': DRIVER_SCHEMA_FIXTURE,
        });
      });
    });
  });

  describe('isFinalized()', function () {
    describe('when the schema is finalized', function () {
      it('should return true', function () {
        finalizeSchema();
        expect(isFinalized()).to.be.true;
      });
    });

    describe('when the schema is not finalized', function () {
      it('should return false', function () {
        resetSchema();
        expect(isFinalized()).to.be.false;
      });
    });
  });

  describe('validate()', function () {
    describe('when schema not yet compiled', function () {
      it('should throw', function () {
        expect(() => validate('foo')).to.throw(SchemaFinalizationError);
      });
    });

    describe('when schema already compiled, with no extensions', function () {
      beforeEach(function () {
        finalizeSchema();
      });

      describe('when provided an invalid schema ID ref', function () {
        it('should throw', function () {
          expect(() => validate('foo', 'bar')).to.throw(
            SchemaUnknownSchemaError,
          );
        });
      });

      describe('when not provided a schema ID ref', function () {
        describe('when provided a valid value', function () {
          it('should return an empty array of no errors', function () {
            expect(validate({server: {address: '127.0.0.1'}})).to.eql(
              [],
            );
          });
        });

        describe('when provided an invalid value', function () {
          it('should return an array containing errors', function () {
            expect(validate({address: '127.0.0.1'})).to.be.an('array')
              .and.to.not.be.empty;
          });
        });
      });

      describe('when provided a schema ID ref', function () {
        describe('when provided a valid value', function () {
          it('should return an empty array of no errors', function () {
            expect(
              validate(
                '127.0.0.1',
                'appium.json#/properties/server/properties/address',
              ),
            ).to.eql([]);
          });
        });

        describe('when provided an invalid value', function () {
          it('should return an array containing errors', function () {
            expect(
              validate(
                '127.0.0.1',
                'appium.json#/properties/server/properties/port',
              ),
            ).to.be.an('array').and.to.not.be.empty;
          });
        });
      });
    });

    describe('when schema already compiled, with extensions', function () {
      beforeEach(function () {
        registerSchema(DRIVER_TYPE, 'stuff', DRIVER_SCHEMA_FIXTURE);
        finalizeSchema();
      });

      describe('when provided an invalid schema ID ref', function () {
        it('should throw', function () {
          expect(() => validate('foo', 'bar')).to.throw(
            SchemaUnknownSchemaError,
          );
        });
      });

      describe('when not provided a schema ID ref', function () {
        describe('when provided a valid value', function () {
          it('should return an empty array of no errors', function () {
            expect(
              validate({server: {driver: {stuff: {answer: 99}}}}),
            ).to.eql([]);
          });
        });

        describe('when provided an invalid value', function () {
          it('should return an array containing errors', function () {
            expect(
              validate({server: {driver: {stuff: {answer: 101}}}}),
            ).to.be.an('array').and.to.not.be.empty;
          });
        });
      });

      describe('when provided a schema ID ref', function () {
        describe('when provided a valid value', function () {
          it('should return an empty array of no errors', function () {
            expect(
              validate(99, 'driver-stuff.json#/properties/answer'),
            ).to.eql([]);
          });
        });

        describe('when provided an invalid value', function () {
          it('should return an array containing errors', function () {
            expect(
              validate(101, 'driver-stuff.json#/properties/answer'),
            ).to.be.an('array').and.to.not.be.empty;
          });
        });
      });
    });
  });

  describe('RoachHotelMap', function () {
    it('should allow writing', function () {
      const map = new RoachHotelMap();
      (() => map.set('foo', 'bar')).should.not.throw();
    });

    it('should allow reading', function () {
      const map = new RoachHotelMap([['foo', 'bar']]);
      (() => map.get('foo')).should.not.throw();
    });

    it('should not allow deletion', function () {
      const map = new RoachHotelMap([['foo', 'bar']]);
      map.delete('foo').should.be.false;
    });

    it('should not allow clearing', function () {
      const map = new RoachHotelMap([['foo', 'bar']]);
      (() => map.clear()).should.throw();
    });

    it('should not allow updating', function () {
      const map = new RoachHotelMap([['foo', 'bar']]);
      (() => map.set('foo', 'baz')).should.throw();
    });
  });
});

/**
 * @typedef {import('ajv/dist/core').default['addSchema']} AjvAddSchema
 * @typedef {import('ajv/dist/core').default['getSchema']} AjvGetSchema
 * @typedef {import('ajv/dist/core').default['validateSchema']} AjvValidateSchema
 */

/**
 * @typedef {import('ajv/dist/core').AnyValidateFunction<any>} AnyValidateFunction
 */
