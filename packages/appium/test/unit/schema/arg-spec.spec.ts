import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {DRIVER_TYPE} from '../../../lib/constants.js';
import {ArgSpec} from '../../../lib/schema/arg-spec.js';

describe('ArgSpec', function () {
  describe('class method', function () {
    describe('create()', function () {
      it('should return a new ArgSpec', function () {
        assert.ok(ArgSpec.create('foo') instanceof ArgSpec);
      });
    });

    describe('toSchemaRef()', function () {
      describe('when provided no extension information', function () {
        it('should return a schema ID for a specific argument', function () {
          assert.strictEqual(ArgSpec.toSchemaRef('foo'), 'appium.json#/properties/server/properties/foo');
        });
      });

      describe('when provided extension information', function () {
        it('should return a schema ID for a specific argument within an extension schema', function () {
          assert.strictEqual(ArgSpec.toSchemaRef('bar', DRIVER_TYPE, 'stuff'), 'driver-stuff.json#/properties/bar');
        });
      });
    });

    describe('toSchemaBaseRef()', function () {
      describe('when provided no extension information', function () {
        it('should return the base schema ID', function () {
          assert.strictEqual(ArgSpec.toSchemaBaseRef(), 'appium.json');
        });
      });

      describe('when provided extension information', function () {
        it('should return a schema ID for an extension', function () {
          assert.strictEqual(ArgSpec.toSchemaBaseRef(DRIVER_TYPE, 'stuff'), 'driver-stuff.json');
        });
      });
    });

    describe('toArg()', function () {
      describe('when provided no extension information', function () {
        it('should return a bare arg name', function () {
          assert.strictEqual(ArgSpec.toArg('foo'), 'foo');
        });
      });

      describe('when provided extension information', function () {
        it('should return an extension-specific arg name', function () {
          assert.strictEqual(ArgSpec.toArg('no-oats', DRIVER_TYPE, 'bad-donkey'), 'driver-bad-donkey-no-oats');
        });
      });
    });

    describe('extensionInfoFromRootSchemaId()', function () {
      describe('when provided the base schema ID', function () {
        it('should return an empty object', function () {
          assert.strictEqual(Object.keys(ArgSpec.extensionInfoFromRootSchemaId('appium.json')).length, 0);
        });
      });

      describe('when provided the schema ID of an extension schema', function () {
        it('should return a proper object', function () {
          assert.deepStrictEqual(ArgSpec.extensionInfoFromRootSchemaId('driver-stuff.json'), {
            extType: DRIVER_TYPE,
            normalizedExtName: 'stuff',
          });
        });
      });
    });
  });
});
