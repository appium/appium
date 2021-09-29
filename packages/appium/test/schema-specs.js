//@ts-check
import _ from 'lodash';
import rewiremock from 'rewiremock/node';
import sinon from 'sinon';
import appiumConfigSchemaModule from '../lib/appium-config-schema';
import flattenedSchemaFixture from './fixtures/flattened-schema';
import defaultArgsFixture from './fixtures/default-args';
import schemaWithExtensions from './fixtures/schema-with-extensions';
import someDriverSchema from './fixtures/driver.schema';

const expect = require('chai').expect;

const appiumConfigSchema = _.cloneDeep(appiumConfigSchemaModule);

describe('schema', function () {
  /** @type {import('../lib/schema')} */
  let schemaModule;
  /** @type {import('sinon').SinonSandbox} */
  let sandbox;

  let mocks;
  /**
   * Mock validation function
   */
  /** @type {SinonStub<Parameters<AnyValidateFunction>,ReturnType<AnyValidateFunction>> & Partial<AnyValidateFunction>} */
  let validate;

  /**
   * Mock Ajv instance
   **/
  let ajvInstance;

  beforeEach(function () {
    sandbox = sinon.createSandbox();

    mocks = {
      // the `compile` method of an `Ajv` instance
      /** @type {SinonStub<any[],typeof ajvInstance>} */
      ajv: sandbox.stub().callsFake(() => ajvInstance),

      '../lib/extension-config': {
        APPIUM_HOME: '/path/to/appium/home',
        SCHEMA_ID_EXTENSION_PROPERTY: 'automationName',
      },

      // extra string formatters; Ajv plugin
      'ajv-formats': sandbox.stub().returnsArg(0),

      'resolve-from': sandbox.stub(),

      '@sidvind/better-ajv-errors': sandbox.stub(),

      '../lib/appium-config-schema': appiumConfigSchema,
    };

    ajvInstance = {
      addSchema:
      /** @type {SinonStub<Parameters<AjvAddSchema>,ReturnType<AjvAddSchema>>} */ (
        sandbox.stub()
      ).callsFake(() => mocks.ajv),

      addKeyword: sandbox.stub(),

      compile: sandbox.stub(),

      getSchema:
      /** @type {SinonStub<Parameters<AjvGetSchema>,typeof validate>} */ (
        sandbox.stub()
      ).returns(validate),
      /**
       * `Ajv#validateSchema` doesn't actually seem to do too much.  it doesn't detect circular objects,
       * and we're checking that it's an object up-front anyway in our `registerSchema` function.
       * @type {SinonStub<Parameters<AjvValidateSchema>,ReturnType<AjvValidateSchema>>}
       **/
      validateSchema: sandbox.stub(),

      removeSchema: sandbox.stub(),
    };

    validate = Object.assign(
      /** @type {SinonStub<Parameters<AnyValidateFunction>,ReturnType<AnyValidateFunction>> & Partial<AnyValidateFunction>} */ (
        sandbox.stub()
      ).returns(true),
      {
        errors: [],
        schema: appiumConfigSchema,
      },
    );

    schemaModule = rewiremock.proxy(() => require('../lib/schema'), mocks);

    schemaModule.reset();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('registerSchema()', function () {
    describe('error conditions', function () {
      beforeEach(function () {
        ajvInstance.validateSchema.callsFake((value) => {
          if (_.isEmpty(value)) {
            throw new TypeError('empty');
          }
        });
      });

      describe('when provided no parameters', function () {
        it('should throw a TypeError', function () {
          // @ts-ignore
          expect(() => schemaModule.registerSchema()).to.throw(
            TypeError,
            'extensionName argument cannot be falsy',
          );
        });
      });

      describe('when provided `type` and `name`, but not `schema`', function () {
        it('should throw a TypeError', function () {
          expect(() =>
            // @ts-ignore
            schemaModule.registerSchema('driver', 'whoopeee'),
          ).to.throw(TypeError, 'empty');
        });
      });

      describe('when provided `type`, a nonempty `name`, but an empty `schema`', function () {
        it('should throw a TypeError', function () {
          expect(() =>
            schemaModule.registerSchema('driver', 'whoopeee', {}),
          ).to.throw(TypeError, 'empty');
        });
      });

      describe('when provided `type` and nonempty `schema`, but no `name`', function () {
        it('should throw a TypeError', function () {
          expect(() =>
            // @ts-ignore
            schemaModule.registerSchema('driver', undefined, {
              title: 'whoopeee',
            }),
          ).to.throw(TypeError, 'extensionName argument cannot be falsy');
        });
      });

      describe('when provided a `type` and nonempty `name`, but an invalid `schema`', function () {
        beforeEach(function () {
          ajvInstance.getSchema.returns();
          ajvInstance.validateSchema.throws(new Error('whoops'));
        });

        it('should throw', function () {
          const schema = {title: 'bargh'};
          expect(() =>
            schemaModule.registerSchema('driver', 'whoopeee', schema),
          ).to.throw('whoops');
        });
      });

      describe('when schema previously registered', function () {
        it('should throw', function () {
          const schema = {title: 'whoopee'};
          schemaModule.registerSchema('driver', 'whoopee', schema);
          expect(() =>
            schemaModule.registerSchema('driver', 'whoopee', schema),
          ).to.throw(Error, /conflicts with an existing schema/);
        });
      });
    });

    describe('when provided a nonempty `type`, `schema` and `name`', function () {
      it('should register the schema', function () {
        const schema = {title: 'whoopee'};
        expect(() =>
          schemaModule.registerSchema('driver', 'whoopee', schema),
        ).not.to.throw();
      });

      describe('when the `name` is not unique but `type` is', function () {
        it('should register both', function () {
          const schema1 = {title: 'pro-skub'};
          const schema2 = {title: 'anti-skub'};
          schemaModule.registerSchema('driver', 'skub', schema1);
          expect(() =>
            schemaModule.registerSchema('plugin', 'skub', schema2),
          ).not.to.throw();
        });
      });
    });
  });

  describe('getSchema()', function () {
    describe('when schema not yet compiled', function () {
      beforeEach(function () {
        ajvInstance.getSchema.returns(undefined);
      });
      it('should throw', function () {
        expect(() => schemaModule.getSchema()).to.throw(
          Error,
          /schema not yet compiled/i,
        );
      });
    });

    describe('when schema compiled', function () {
      it('should return a schema', function () {
        expect(schemaModule.getSchema()).to.equal(appiumConfigSchema);
      });
    });
  });

  describe('getDefaultsFromSchema()', function () {
    describe('when schema not yet compiled', function () {
      beforeEach(function () {
        ajvInstance.getSchema.returns(undefined);
      });

      it('should throw', function () {
        expect(() => schemaModule.getDefaultsFromSchema()).to.throw(
          Error,
          /schema not yet compiled/i,
        );
      });
    });

    describe('when schema already compiled', function () {
      beforeEach(function () {
        ajvInstance.getSchema.returns(validate);
      });

      it('should return a Record object with only defined default values', function () {
        const defaults = schemaModule.getDefaultsFromSchema();
        expect(defaults).to.deep.equal(defaultArgsFixture);
      });

      describe('when extension schemas include defaults', function () {
        beforeEach(function () {
          ajvInstance.getSchema.returns({
            ...validate,
            schema: schemaWithExtensions,
          });
        });

        it('should return a Record object containing defaults for the extensions', function () {
          const defaults = schemaModule.getDefaultsFromSchema();
          expect(defaults).to.have.property(
            'driver-fake-sillyWebServerHost',
            'sillyhost',
          );
        });
      });
    });
  });

  describe('flattenSchema()', function () {
    describe('when schema not yet compiled', function () {
      beforeEach(function () {
        ajvInstance.getSchema.returns(undefined);
      });

      it('should throw', function () {
        expect(() => schemaModule.flattenSchema()).to.throw(
          Error,
          /schema not yet compiled/i,
        );
      });
    });

    describe('when schema compiled', function () {
      beforeEach(function () {
        ajvInstance.getSchema.returns(validate);
        // sanity check
        expect(
          ajvInstance.getSchema().schema.properties.driver.properties.fake,
        ).not.to.exist;
      });

      it('should flatten a schema', function () {
        expect(schemaModule.flattenSchema()).to.deep.equal(
          flattenedSchemaFixture,
        );
      });
    });

    describe('when extensions provide schemas', function () {
      let expected;

      beforeEach(function () {
        ajvInstance.getSchema.returns({
          ...validate,
          schema: schemaWithExtensions,
        });
        // sanity check
        expect(
          ajvInstance.getSchema().schema.properties.driver.properties.fake,
        ).to.exist;

        // these props would be added by the fake-driver extension
        expected = {
          ...flattenedSchemaFixture,
          'driver-fake-sillyWebServerHost': {
            default: 'sillyhost',
            description: 'The host to use for the fake web server',
            type: 'string',
          },
          'driver-fake-sillyWebServerPort': {
            description: 'The port to use for the fake web server',
            type: 'integer',
            minimum: 1,
            maximum: 65535,
          },
        };
      });

      it('should flatten a schema', function () {
        expect(schemaModule.flattenSchema()).to.deep.equal(expected);
      });
    });
  });

  describe('readExtensionSchema()', function () {
    let extData;

    beforeEach(function () {
      extData = {
        installPath: 'fixtures',
        pkgName: 'some-pkg',
        schema: 'driver.schema.js',
        automationName: 'stuff',
      };
      mocks['resolve-from'].returns(
        require.resolve('./fixtures/driver.schema.js'),
      );
    });

    describe('error conditions', function () {
      describe('when the extension data is missing `installPath`', function () {
        it('should throw', function () {
          delete extData.installPath;
          expect(() =>
            schemaModule.readExtensionSchema('driver', extData),
          ).to.throw(Error, 'Incomplete extension data');
        });
      });

      describe('when the extension data is missing `pkgName`', function () {
        it('should throw', function () {
          delete extData.pkgName;
          expect(() =>
            schemaModule.readExtensionSchema('driver', extData),
          ).to.throw(Error, 'Incomplete extension data');
        });
      });

      describe('when the extension data is missing `schema`', function () {
        it('should throw', function () {
          delete extData.schema;
          expect(() =>
            schemaModule.readExtensionSchema('driver', extData),
          ).to.throw(Error, 'Incomplete extension data');
        });
      });

      describe('when the extension data is missing `automationName`', function () {
        it('should throw', function () {
          delete extData.automationName;
          expect(() =>
            schemaModule.readExtensionSchema('driver', extData),
          ).to.throw(Error, 'Incomplete extension data');
        });
      });
    });

    describe('when the extension schema has already been registered', function () {
      it('should not attempt to re-register the schema', function () {
        schemaModule.readExtensionSchema('driver', extData);
        mocks['resolve-from'].reset();
        // mocks['resolve-from'].returns(require.resolve('./fixtures/driver.schema.js'));
        schemaModule.readExtensionSchema('driver', extData);
        expect(mocks['resolve-from']).not.to.have.been.called;
      });
    });

    describe('when the extension schema has not yet been registered', function () {
      it('should resolve and load the extension schema file', function () {
        schemaModule.readExtensionSchema('driver', extData);

        // we don't have access to the schema registration cache directly, so this is as close as we can get.
        expect(mocks['resolve-from']).to.have.been.calledOnce;
        // ajvInstance.validateSchema() is called on any schema before it is finally added to the registration cache
        expect(ajvInstance.validateSchema).to.have.been.calledWith(
          someDriverSchema,
          true,
        );
      });
    });
  });

  describe('formatErrors()', function () {
    beforeEach(function () {
      // ajvInstance.getSchema returns `validate`
      ajvInstance.getSchema.returns(validate);
    });
    describe('when provided `errors` as an empty array', function () {
      it('should throw', function () {
        expect(() => schemaModule.formatErrors([])).to.throw(
          TypeError,
          'Array of errors must be non-empty',
        );
      });
    });

    describe('when provided `errors` as `undefined`', function () {
      it('should throw', function () {
        // @ts-ignore
        expect(() => schemaModule.formatErrors()).to.throw(
          TypeError,
          'Array of errors must be non-empty',
        );
      });
    });

    describe('when provided `errors` as a non-empty array', function () {
      it('should return a string', function () {
        // @ts-ignore
        expect(schemaModule.formatErrors([{}])).to.be.a('string');
      });
    });

    describe('when `opts.pretty` is `false`', function () {
      it('should call `betterAjvErrors()` with option `format: "js"`', function () {
        // @ts-ignore
        schemaModule.formatErrors([{}], {}, {pretty: false});
        expect(mocks['@sidvind/better-ajv-errors']).to.have.been.calledWith(
          validate.schema,
          undefined,
          [{}],
          {format: 'js', json: undefined},
        );
      });
    });

    describe('when `opts.json` is a string', function () {
      it('should call `betterAjvErrors()` with option `json: opts.json`', function () {
        // @ts-ignore
        schemaModule.formatErrors([{}], {}, {json: '{"foo": "bar"}'});
        expect(mocks['@sidvind/better-ajv-errors']).to.have.been.calledWith(
          validate.schema,
          undefined,
          [{}],
          {format: 'cli', json: '{"foo": "bar"}'},
        );
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
