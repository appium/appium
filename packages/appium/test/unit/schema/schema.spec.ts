import assert from 'node:assert/strict';
import {describe, it, beforeEach, afterEach} from 'node:test';

import {AppiumConfigJsonSchema} from '@appium/schema';
import {createSandbox} from 'sinon';

import {DRIVER_TYPE, PLUGIN_TYPE} from '../../../lib/constants';
import {APPIUM_CONFIG_SCHEMA_ID} from '../../../lib/schema/arg-spec';
import type * as SchemaModule from '../../../lib/schema/schema';
import defaultArgsFixture from '../../fixtures/default-args';
import DRIVER_SCHEMA_FIXTURE from '../../fixtures/driver-schema';
import flattenedSchemaFixture from '../../fixtures/flattened-schema';
import {rewiremock} from '../../helpers';

describe('schema', function () {
  let sandbox: ReturnType<typeof createSandbox>;
  let SchemaFinalizationError: typeof SchemaModule.SchemaFinalizationError;
  let SchemaUnknownSchemaError: typeof SchemaModule.SchemaUnknownSchemaError;
  let SchemaUnsupportedSchemaError: typeof SchemaModule.SchemaUnsupportedSchemaError;
  let resetSchema: typeof SchemaModule.resetSchema;
  let registerSchema: typeof SchemaModule.registerSchema;
  let getSchema: typeof SchemaModule.getSchema;
  let finalizeSchema: typeof SchemaModule.finalizeSchema;
  let getDefaultsForSchema: typeof SchemaModule.getDefaultsForSchema;
  let flattenSchema: typeof SchemaModule.flattenSchema;
  let isFinalized: typeof SchemaModule.isFinalized;
  let validate: typeof SchemaModule.validate;
  let RoachHotelMap: typeof SchemaModule.RoachHotelMap;
  let mocks: Record<string, ReturnType<ReturnType<typeof createSandbox>['stub']>>;

  beforeEach(function () {
    sandbox = createSandbox();
    mocks = {
      '@sidvind/better-ajv-errors': sandbox.stub(),
    };

    ({
      SchemaFinalizationError,
      SchemaUnknownSchemaError,
      SchemaUnsupportedSchemaError,
      RoachHotelMap,
      resetSchema,
      registerSchema,
      getSchema,
      isFinalized,
      finalizeSchema,
      getDefaultsForSchema,
      flattenSchema,
      validate,
    } = rewiremock.proxy(
      () => require('../../../lib/schema/schema') as typeof SchemaModule,
      mocks,
    ) as typeof SchemaModule);
    resetSchema();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('registerSchema()', function () {
    describe('error conditions', function () {
      describe('when provided no parameters', function () {
        it('should throw a TypeError', async function () {
          await assert.rejects(
            (registerSchema as (...args: unknown[]) => Promise<unknown>)(),
            (err: Error) => err instanceof TypeError && /expected extension type/i.test(err.message),
          );
        });
      });

      describe('when provided `type` and `name`, but not `schema`', function () {
        it('should throw a TypeError', async function () {
          await assert.rejects(
            (registerSchema as (...args: unknown[]) => Promise<unknown>)(DRIVER_TYPE, 'whoopeee'),
            (err: Error) => err instanceof TypeError && /expected extension type/i.test(err.message),
          );
        });
      });

      describe('when provided `type` and nonempty `schema`, but no `name`', function () {
        it('should throw a TypeError', async function () {
          await assert.rejects(
            (registerSchema as (...args: unknown[]) => Promise<unknown>)(DRIVER_TYPE, undefined, {
              title: 'whoopeee',
            }),
            (err: Error) => err instanceof TypeError && /expected extension type/i.test(err.message),
          );
        });
      });

      describe('when the schema is of an unsupported type', function () {
        describe('when schema is an object but not a plain object', function () {
          it('should throw', async function () {
            await assert.rejects(
              (registerSchema as (...args: unknown[]) => Promise<unknown>)(DRIVER_TYPE, 'whoopeee', [45]),
              (err: Error) => err instanceof SchemaUnsupportedSchemaError && /must be a plain object/i.test(err.message),
            );
          });
        });

        describe('when the schema is async', function () {
          it('should throw', async function () {
            await assert.rejects(
              (registerSchema as (...args: unknown[]) => Promise<unknown>)(DRIVER_TYPE, 'whoopee', {
                $async: true,
              }),
              (err: Error) =>
                err instanceof SchemaUnsupportedSchemaError && /cannot be an async schema/i.test(err.message),
            );
          });
        });

        describe('when the schema is boolean', function () {
          it('should throw', async function () {
            await assert.rejects(
              (registerSchema as (...args: unknown[]) => Promise<unknown>)(DRIVER_TYPE, 'whoopee', true),
              SchemaUnsupportedSchemaError,
            );
          });
        });
      });

      describe('when schema previously registered', function () {
        describe('when the schema is identical', function () {
          it('should not throw', async function () {
            const schemaObject = {title: 'whoopee'};
            await registerSchema(DRIVER_TYPE, 'whoopee', schemaObject);
            await assert.doesNotReject(registerSchema(DRIVER_TYPE, 'whoopee', schemaObject));
          });
        });

        describe('when the schema is different', function () {
          it('should throw', async function () {
            const schemaObject = {title: 'whoopee'};
            await registerSchema(DRIVER_TYPE, 'whoopee', schemaObject);
            await assert.rejects(
              registerSchema(DRIVER_TYPE, 'whoopee', {
                title: 'cushion?',
              }),
              (err: Error) => err instanceof Error && /conflicts with an existing schema/.test(err.message),
            );
          });
        });
      });
    });

    describe('when provided a nonempty `type`, `schema` and `name`', function () {
      it('should register the schema', async function () {
        const schemaObject = {title: 'whoopee'};
        await assert.doesNotReject(registerSchema(DRIVER_TYPE, 'whoopee', schemaObject));
      });

      describe('when the `name` is not unique but `type` is', function () {
        it('should register both', async function () {
          const schema1 = {title: 'pro-skub'};
          const schema2 = {title: 'anti-skub'};
          await registerSchema(DRIVER_TYPE, 'skub', schema1);
          await assert.doesNotReject(registerSchema(PLUGIN_TYPE, 'skub', schema2));
        });
      });
    });
  });

  describe('getSchema()', function () {
    describe('when schema not yet compiled', function () {
      it('should throw', function () {
        assert.throws(() => getSchema(), SchemaFinalizationError);
      });
    });

    describe('when schema already compiled', function () {
      beforeEach(async function () {
        await finalizeSchema();
      });

      it('should return a schema', function () {
        assert.deepStrictEqual(getSchema(), AppiumConfigJsonSchema);
      });
    });

    describe('when schema already compiled and provided a schema ID', function () {
      beforeEach(async function () {
        await finalizeSchema();
      });

      describe('when schema ID is the base schema ID', function () {
        it('should return the base schema', function () {
          assert.deepStrictEqual(getSchema(APPIUM_CONFIG_SCHEMA_ID), AppiumConfigJsonSchema);
        });
      });

      describe('when the schema ID is a reference', function () {
        it('should return the schema for the reference', function () {
          const result = getSchema(`${APPIUM_CONFIG_SCHEMA_ID}#/properties/server/properties/address`);
          assert.ok(result);
          assert.deepStrictEqual(
            result,
            (
              AppiumConfigJsonSchema as {
                properties: {server: {properties: {address: unknown}}};
              }
            ).properties.server.properties.address,
          );
        });
      });

      describe('when schema ID is invalid', function () {
        it('should throw', function () {
          assert.throws(() => getSchema('schema-the-clown'), SchemaUnknownSchemaError);
        });
      });
    });

    describe('when schema already compiled including an extension', function () {
      beforeEach(async function () {
        await registerSchema(DRIVER_TYPE, 'stuff', DRIVER_SCHEMA_FIXTURE);
        await finalizeSchema();
      });

      it('should return the extension schema', function () {
        assert.deepStrictEqual(getSchema('driver-stuff.json'), DRIVER_SCHEMA_FIXTURE);
      });
    });
  });

  describe('getDefaultsForSchema()', function () {
    describe('when schema not yet compiled', function () {
      it('should throw', function () {
        assert.throws(() => getDefaultsForSchema(), SchemaFinalizationError);
      });
    });

    describe('when schema already compiled', function () {
      it('should return a Record object with only defined default values', async function () {
        await finalizeSchema();
        const defaults = getDefaultsForSchema();
        assert.deepStrictEqual(defaults, defaultArgsFixture);
      });

      describe('when extension schemas include defaults', function () {
        it('should return a Record object containing defaults for the extensions', async function () {
          await registerSchema(DRIVER_TYPE, 'stuff', DRIVER_SCHEMA_FIXTURE);
          await finalizeSchema();
          const defaults = getDefaultsForSchema();
          assert.strictEqual((defaults as Record<string, unknown>)['driver.stuff.answer'], 50);
        });
      });
    });
  });

  describe('flattenSchema()', function () {
    describe('when schema not yet compiled', function () {
      it('should throw', function () {
        assert.throws(() => flattenSchema(), SchemaFinalizationError);
      });
    });

    describe('when schema compiled', function () {
      beforeEach(async function () {
        resetSchema();
        await finalizeSchema();
      });

      it('should flatten a schema', function () {
        assert.ok(flattenSchema().length >= flattenedSchemaFixture.length);
      });
    });

    describe('when extensions provide schemas', function () {
      let expected: Array<{schema: object; argSpec: object}>;

      beforeEach(async function () {
        await registerSchema(DRIVER_TYPE, 'fake', require('@appium/fake-driver/build/lib/fake-driver-schema').default);
        await finalizeSchema();

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
        assert.ok(flattenSchema().length >= expected.length);
      });
    });
  });

  describe('finalizeSchema()', function () {
    describe('when no extensions registered schemas', function () {
      it('should return a Record containing the single base schema', async function () {
        assert.deepStrictEqual(await finalizeSchema(), {
          [APPIUM_CONFIG_SCHEMA_ID]: AppiumConfigJsonSchema,
        });
      });
    });

    describe('when extensions register schemas', function () {
      beforeEach(async function () {
        await registerSchema(DRIVER_TYPE, 'stuff', DRIVER_SCHEMA_FIXTURE);
      });

      it('should return a Record containing all extension schemas and the base schema', async function () {
        type ServerDriverSchema = {
          properties: {server: {properties: {driver: {properties: Record<string, unknown>}}}};
        };
        const baseSchemaWithRefs = structuredClone(AppiumConfigJsonSchema as ServerDriverSchema);
        baseSchemaWithRefs.properties.server.properties.driver.properties.stuff = {
          $ref: 'driver-stuff.json',
          $comment: 'stuff',
        };
        assert.deepStrictEqual(await finalizeSchema(), {
          [APPIUM_CONFIG_SCHEMA_ID]: baseSchemaWithRefs,
          'driver-stuff.json': DRIVER_SCHEMA_FIXTURE,
        });
      });
    });
  });

  describe('isFinalized()', function () {
    describe('when the schema is finalized', function () {
      it('should return true', async function () {
        await finalizeSchema();
        assert.strictEqual(isFinalized(), true);
      });
    });

    describe('when the schema is not finalized', function () {
      it('should return false', function () {
        resetSchema();
        assert.strictEqual(isFinalized(), false);
      });
    });
  });

  describe('validate()', function () {
    describe('when schema not yet compiled', function () {
      it('should throw', function () {
        assert.throws(() => validate('foo'), SchemaFinalizationError);
      });
    });

    describe('when schema already compiled, with no extensions', function () {
      beforeEach(async function () {
        await finalizeSchema();
      });

      describe('when provided an invalid schema ID ref', function () {
        it('should throw', function () {
          assert.throws(() => validate('foo', 'bar'), SchemaUnknownSchemaError);
        });
      });

      describe('when not provided a schema ID ref', function () {
        describe('when provided a valid value', function () {
          it('should return an empty array of no errors', function () {
            assert.deepStrictEqual(validate({server: {address: '127.0.0.1'}}), []);
          });
        });

        describe('when provided an invalid value', function () {
          it('should return an array containing errors', function () {
            const result = validate({address: '127.0.0.1'});
            assert.ok(Array.isArray(result));
            assert.ok(result.length > 0);
          });
        });
      });

      describe('when provided a schema ID ref', function () {
        describe('when provided a valid value', function () {
          it('should return an empty array of no errors', function () {
            assert.deepStrictEqual(validate('127.0.0.1', 'appium.json#/properties/server/properties/address'), []);
          });
        });

        describe('when provided an invalid value', function () {
          it('should return an array containing errors', function () {
            const result = validate('127.0.0.1', 'appium.json#/properties/server/properties/port');
            assert.ok(Array.isArray(result));
            assert.ok(result.length > 0);
          });
        });
      });
    });

    describe('when schema already compiled, with extensions', function () {
      beforeEach(async function () {
        await registerSchema(DRIVER_TYPE, 'stuff', DRIVER_SCHEMA_FIXTURE);
        await finalizeSchema();
      });

      describe('when provided an invalid schema ID ref', function () {
        it('should throw', function () {
          assert.throws(() => validate('foo', 'bar'), SchemaUnknownSchemaError);
        });
      });

      describe('when not provided a schema ID ref', function () {
        describe('when provided a valid value', function () {
          it('should return an empty array of no errors', function () {
            assert.deepStrictEqual(validate({server: {driver: {stuff: {answer: 99}}}}), []);
          });
        });

        describe('when provided an invalid value', function () {
          it('should return an array containing errors', function () {
            const result = validate({server: {driver: {stuff: {answer: 101}}}});
            assert.ok(Array.isArray(result));
            assert.ok(result.length > 0);
          });
        });
      });

      describe('when provided a schema ID ref', function () {
        describe('when provided a valid value', function () {
          it('should return an empty array of no errors', function () {
            assert.deepStrictEqual(validate(99, 'driver-stuff.json#/properties/answer'), []);
          });
        });

        describe('when provided an invalid value', function () {
          it('should return an array containing errors', function () {
            const result = validate(101, 'driver-stuff.json#/properties/answer');
            assert.ok(Array.isArray(result));
            assert.ok(result.length > 0);
          });
        });
      });
    });
  });

  describe('RoachHotelMap', function () {
    it('should allow writing', function () {
      const map = new RoachHotelMap();
      assert.doesNotThrow(() => map.set('foo', 'bar'));
    });

    it('should allow reading', function () {
      const map = new RoachHotelMap([['foo', 'bar']]);
      assert.doesNotThrow(() => map.get('foo'));
    });

    it('should not allow deletion', function () {
      const map = new RoachHotelMap([['foo', 'bar']]);
      assert.strictEqual(map.delete('foo'), false);
    });

    it('should not allow clearing', function () {
      const map = new RoachHotelMap([['foo', 'bar']]);
      assert.throws(() => map.clear());
    });

    it('should not allow updating', function () {
      const map = new RoachHotelMap([['foo', 'bar']]);
      assert.throws(() => map.set('foo', 'baz'));
    });
  });
});
