//@ts-check
import rewiremock from 'rewiremock/node';
import sinon from 'sinon';
import appiumConfigSchema from '../lib/appium-config-schema';
import flattenedSchemaFixture from './fixtures/flattened-schema';
import defaultArgsFixture from './fixtures/default-args';

const expect = require('chai').expect;

describe('schema', function () {
  /** @type {import('../lib/schema')} */
  let schema;
  /** @type {import('sinon').SinonSandbox} */
  let sandbox;

  let mocks;

  beforeEach(function () {
    sandbox = sinon.createSandbox();

    mocks = {
      '../lib/extension-config': {
        APPIUM_HOME: '/path/to/appium/home',
        SCHEMA_ID_EXTENSION_PROPERTY: 'automationName',
      },

      'resolve-from': sandbox.stub(),

      '@sidvind/better-ajv-errors': sandbox.stub(),
    };

    schema = rewiremock.proxy(() => require('../lib/schema'), mocks);

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
        expect(defaults).to.deep.equal(defaultArgsFixture);
      });

      describe('when extension schemas include defaults', function () {
        it('should return a Record object containing defaults for the extensions', function () {
          const extData = {
            installPath: 'fixtures',
            pkgName: 'some-pkg',
            schema: 'driver.schema.js',
            automationName: 'stuff',
          };
          mocks['resolve-from'].returns(
            require.resolve('./fixtures/driver.schema.js'),
          );
          schema.readExtensionSchema('driver', 'stuff', extData);
          schema.finalizeSchema();
          const defaults = schema.getDefaultsFromSchema();
          expect(defaults).to.have.property('driver-stuff-answer', 50);
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
        expect(schema.hasRegisteredSchema('driver', 'stuff')).to.be.false;
        // sanity check
        // expect(schema.getSchema().properties.driver.properties).to.be.empty;
      });

      it('should flatten a schema', function () {
        expect(schema.flattenSchema()).to.deep.equal(flattenedSchemaFixture);
      });
    });

    describe('when extensions provide schemas', function () {
      let expected;

      beforeEach(function () {
        mocks['resolve-from'].returns(
          require.resolve('@appium/fake-driver/build/lib/fake-driver-schema'),
        );

        schema.readExtensionSchema('driver', 'fake', {
          installPath: 'derp',
          schema: 'herp',
          automationName: 'Fake',
          pkgName: '@appium/fake-driver',
        });
        schema.finalizeSchema();
        // sanity check
        expect(schema.getSchema().properties.driver.properties.fake).to.exist;

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
        expect(schema.flattenSchema()).to.deep.equal(expected);
      });
    });
  });

  describe('readExtensionSchema()', function () {
    /** @type {import('../lib/schema').ExtData} */
    let extData;
    const extName = 'stuff';

    describe('driver', function () {

      beforeEach(function () {
        extData = {
          installPath: 'fixtures',
          pkgName: 'some-pkg',
          schema: 'driver.schema.js',
        };
        mocks['resolve-from'].returns(
          require.resolve('./fixtures/driver.schema.js'),
        );
      });

      describe('error conditions', function () {
        describe('when the extension data is missing `installPath`', function () {
          it('should throw', function () {
            // @ts-ignore
            delete extData.installPath;
            expect(() =>
              schema.readExtensionSchema('driver', extName, extData),
            ).to.throw(Error, 'Incomplete extension data');
          });
        });

        describe('when the extension data is missing `pkgName`', function () {
          it('should throw', function () {
            // @ts-ignore
            delete extData.pkgName;
            expect(() =>
              schema.readExtensionSchema('driver', extName, extData),
            ).to.throw(Error, 'Incomplete extension data');
          });
        });

        describe('when the extension data is missing `schema`', function () {
          it('should throw', function () {
            delete extData.schema;
            expect(() =>
              schema.readExtensionSchema('driver', extName, extData),
            ).to.throw(Error, 'Incomplete extension data');
          });
        });

        describe('when the `extName` was not provided', function () {
          it('should throw', function () {
            expect(() =>
              schema.readExtensionSchema('driver', undefined, extData),
            ).to.throw(Error, 'Incomplete extension data');
          });
        });
      });

      describe('when the extension schema has already been registered', function () {
        it('should not attempt to re-register the schema', function () {
          schema.readExtensionSchema('driver', extName, extData);
          mocks['resolve-from'].reset();
          schema.readExtensionSchema('driver', extName, extData);
          expect(mocks['resolve-from']).not.to.have.been.called;
        });
      });

      describe('when the extension schema has not yet been registered', function () {
        it('should resolve and load the extension schema file', function () {
          schema.readExtensionSchema('driver', extName, extData);

          // we don't have access to the schema registration cache directly, so this is as close as we can get.
          expect(mocks['resolve-from']).to.have.been.calledOnce;
        });
      });
    });

    describe('plugin', function () {
      const extName = 'stuff';
      /** @type {import('../lib/schema').ExtData} */
      let extData;

      beforeEach(function () {
        extData = {
          installPath: 'fixtures',
          pkgName: 'some-pkg',
          schema: 'plugin.schema.js',
        };
        mocks['resolve-from'].returns(
          require.resolve('./fixtures/plugin.schema.js'),
        );
      });

      describe('error conditions', function () {
        describe('when the extension data is missing `installPath`', function () {
          it('should throw', function () {
            // @ts-ignore
            delete extData.installPath;
            expect(() =>
              schema.readExtensionSchema('plugin', extName, extData),
            ).to.throw(Error, 'Incomplete extension data');
          });
        });

        describe('when the extension data is missing `pkgName`', function () {
          it('should throw', function () {
            // @ts-ignore
            delete extData.pkgName;
            expect(() =>
              schema.readExtensionSchema('plugin', extName, extData),
            ).to.throw(Error, 'Incomplete extension data');
          });
        });

        describe('when the extension data is missing `schema`', function () {
          it('should throw', function () {
            delete extData.schema;
            expect(() =>
              schema.readExtensionSchema('plugin', extName, extData),
            ).to.throw(Error, 'Incomplete extension data');
          });
        });

        describe('when the `extName` was not provided', function () {
          it('should throw', function () {
            expect(() =>
              schema.readExtensionSchema('plugin', undefined, extData),
            ).to.throw(Error, 'Incomplete extension data');
          });
        });
      });

      describe('when the extension schema has already been registered', function () {
        it('should not attempt to re-register the schema', function () {
          schema.readExtensionSchema('plugin', extName, extData);
          mocks['resolve-from'].reset();
          schema.readExtensionSchema('plugin', extName, extData);
          expect(mocks['resolve-from']).not.to.have.been.called;
        });
      });

      describe('when the extension schema has not yet been registered', function () {
        it('should resolve and load the extension schema file', function () {
          schema.readExtensionSchema('plugin', extName, extData);

          // we don't have access to the schema registration cache directly, so this is as close as we can get.
          expect(mocks['resolve-from']).to.have.been.calledOnce;
        });
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
