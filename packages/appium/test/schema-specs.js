//@ts-check

import sinon from 'sinon';
import appiumConfigSchema from '../lib/schema/appium-config-schema';
import defaultArgsFixture from './fixtures/default-args';
import flattenedSchemaFixture from './fixtures/flattened-schema';
import {rewiremock} from './helpers';

import DRIVER_SCHEMA_FIXTURE from './fixtures/driver.schema';

const expect = require('chai').expect;

describe('schema', function () {
  /** @type {import('../lib/schema/schema')} */
  let schema;
  /** @type {import('sinon').SinonSandbox} */
  let sandbox;

  let mocks;

  beforeEach(function () {
    sandbox = sinon.createSandbox();

    mocks = {
      '../lib/extension-config': {
        DRIVER_TYPE: 'driver',
        PLUGIN_TYPE: 'plugin',
      },

      'resolve-from': sandbox.stub(),

      '@sidvind/better-ajv-errors': sandbox.stub(),
    };

    schema = rewiremock.proxy(() => require('../lib/schema/schema'), mocks);

    schema.resetSchema();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('registerSchema()', function () {
    describe('error conditions', function () {
      describe('when provided no parameters', function () {
        it('should throw a TypeError', function () {
          // @ts-ignore
          expect(() => schema.registerSchema()).to.throw(
            TypeError,
            'Expected nonempty extension type, extension name and schema parameters',
          );
        });
      });

      describe('when provided `type` and `name`, but not `schema`', function () {
        it('should throw a TypeError', function () {
          expect(() =>
            // @ts-ignore
            schema.registerSchema('driver', 'whoopeee'),
          ).to.throw(
            TypeError,
            'Expected nonempty extension type, extension name and schema parameters',
          );
        });
      });

      describe('when provided `type`, a nonempty `name`, but an empty `schema`', function () {
        it('should throw a TypeError', function () {
          expect(() =>
            schema.registerSchema('driver', 'whoopeee', {}),
          ).to.throw(
            TypeError,
            'Expected nonempty extension type, extension name and schema parameters',
          );
        });
      });

      describe('when provided `type` and nonempty `schema`, but no `name`', function () {
        it('should throw a TypeError', function () {
          expect(() =>
            // @ts-ignore
            schema.registerSchema('driver', undefined, {
              title: 'whoopeee',
            }),
          ).to.throw(
            TypeError,
            'Expected nonempty extension type, extension name and schema parameters',
          );
        });
      });

      describe('when provided a `type` and nonempty `name`, but an invalid `schema`', function () {
        it('should throw', function () {
          const schemaObject = [45];
          expect(() =>
            schema.registerSchema('driver', 'whoopeee', schemaObject),
          ).to.throw(/schema is invalid/i);
        });
      });

      describe('when schema previously registered', function () {
        it('should throw', function () {
          const schemaObject = {title: 'whoopee'};
          schema.registerSchema('driver', 'whoopee', schemaObject);
          expect(() =>
            schema.registerSchema('driver', 'whoopee', schemaObject),
          ).to.throw(Error, /conflicts with an existing schema/);
        });
      });
    });

    describe('when provided a nonempty `type`, `schema` and `name`', function () {
      it('should register the schema', function () {
        const schemaObject = {title: 'whoopee'};
        expect(() =>
          schema.registerSchema('driver', 'whoopee', schemaObject),
        ).not.to.throw();
      });

      describe('when the `name` is not unique but `type` is', function () {
        it('should register both', function () {
          const schema1 = {title: 'pro-skub'};
          const schema2 = {title: 'anti-skub'};
          schema.registerSchema('driver', 'skub', schema1);
          expect(() =>
            schema.registerSchema('plugin', 'skub', schema2),
          ).not.to.throw();
        });
      });
    });
  });

  describe('getSchema()', function () {
    describe('when schema not yet compiled', function () {
      it('should throw', function () {
        expect(() => schema.getSchema()).to.throw(
          Error,
          /schema not yet compiled/i,
        );
      });
    });

    describe('when schema compiled', function () {
      beforeEach(function () {
        schema.finalizeSchema();
      });

      it('should return a schema', function () {
        expect(schema.getSchema()).to.eql(appiumConfigSchema);
      });
    });

    describe('when schema already compiled and provided a schema id', function () {
      beforeEach(function () {
        schema.finalizeSchema();
      });
      describe('when schema id is valid', function () {
        it('should return a schema', function () {
          expect(schema.getSchema(schema.APPIUM_CONFIG_SCHEMA_ID)).to.eql(
            appiumConfigSchema,
          );
        });
      });

      describe('when schema id is invalid', function () {
        it('should throw', function () {
          expect(() => schema.getSchema('schema-the-clown')).to.throw(
            ReferenceError,
            /unknown schema/i,
          );
        });
      });
    });
  });

  describe('getDefaultsFromSchema()', function () {
    describe('when schema not yet compiled', function () {
      it('should throw', function () {
        expect(() => schema.getDefaultsFromSchema()).to.throw(
          Error,
          /schema not yet compiled/i,
        );
      });
    });

    describe('when schema already compiled', function () {
      it('should return a Record object with only defined default values', function () {
        schema.finalizeSchema();
        const defaults = schema.getDefaultsFromSchema();
        expect(defaults).to.eql(defaultArgsFixture);
      });

      describe('when extension schemas include defaults', function () {
        it('should return a Record object containing defaults for the extensions', function () {
          schema.registerSchema('driver', 'stuff', DRIVER_SCHEMA_FIXTURE);
          schema.finalizeSchema();
          const defaults = schema.getDefaultsFromSchema();
          // extensions have a key that looks like a keypath. we may want to change that
          expect(defaults).to.have.property('driver.stuff.answer', 50);
        });
      });
    });
  });

  describe('flattenSchema()', function () {
    describe('when schema not yet compiled', function () {
      it('should throw', function () {
        expect(() => schema.flattenSchema()).to.throw(
          Error,
          /schema not yet compiled/i,
        );
      });
    });

    describe('when schema compiled', function () {
      beforeEach(function () {
        schema.resetSchema();
        schema.finalizeSchema();
        // sanity check
        expect(schema.getSchema().properties.driver.properties).to.be.empty;
      });

      it('should flatten a schema', function () {
        expect(schema.flattenSchema()).to.eql(flattenedSchemaFixture);
      });
    });

    describe('when extensions provide schemas', function () {
      let expected;

      beforeEach(function () {
        // TS complains about this require()
        // @ts-ignore
        schema.registerSchema('driver', 'fake', require('@appium/fake-driver/build/lib/fake-driver-schema').default);
        schema.finalizeSchema();
        // sanity check
        expect(schema.getSchema().properties.driver.properties.fake).to.exist;

        // these props would be added by the fake-driver extension
        expected = [
          ...flattenedSchemaFixture,
          {
            argSpec: {
              name: 'silly-web-server-port',
              extName: 'fake',
              extType: 'driver',
              id: 'driver-fake-silly-web-server-port',
              dest: 'driver.fake.sillyWebServerPort'
            },
            schema: {
              description: 'The port to use for the fake web server',
              maximum: 65535,
              minimum: 1,
              type: 'integer',
            },
          },
          {
            argSpec: {
              name: 'sillyWebServerHost',
              extName: 'fake',
              extType: 'driver',
              id: 'driver-fake-silly-web-server-host',
              dest: 'driver.fake.sillyWebServerHost',
              defaultValue: 'sillyhost'
            },
            schema: {
              default: 'sillyhost',
              description: 'The host to use for the fake web server',
              type: 'string',
            },
          },
        ];
      });

      it('should flatten a schema', function () {
        expect(schema.flattenSchema()).to.eql(expected);
      });
    });
  });



  describe('isFinalized()', function () {
    describe('when the schema is finalized', function () {
      it('should return true', function () {
        schema.finalizeSchema();
        expect(schema.isFinalized()).to.be.true;
      });
    });

    describe('when the schema is not finalized', function () {
      it('should return false', function () {
        schema.resetSchema();
        expect(schema.isFinalized()).to.be.false;
      });
    });
  });
});

/**
 * @template P,R
 * @typedef {import('sinon').SinonStub<P,R>} SinonStub<P,R>
 */

/**
 * @typedef {import('ajv').default['addSchema']} AjvAddSchema
 * @typedef {import('ajv').default['getSchema']} AjvGetSchema<any>
 * @typedef {import('ajv').default['validateSchema']} AjvValidateSchema
 */

/**
 * @typedef {import('ajv/dist/core').AnyValidateFunction<any>} AnyValidateFunction
 */
