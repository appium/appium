// @ts-check

import { DRIVER_TYPE } from '../../../lib/constants';
import { ArgSpec } from '../../../lib/schema/arg-spec';

const {expect} = chai;

describe('ArgSpec', function () {
  describe('class method', function () {
    describe('create()', function () {
      it('should return a new ArgSpec', function () {
        expect(ArgSpec.create('foo')).to.be.an.instanceof(ArgSpec);
      });
    });

    describe('toSchemaRef()', function () {
      describe('when provided no extension information', function () {
        it('should return a schema ID for a specific argument', function () {
          expect(ArgSpec.toSchemaRef('foo')).to.equal(
            'appium.json#/properties/server/properties/foo',
          );
        });
      });

      describe('when provided extension information', function () {
        it('should return a schema ID for a specific argument within an extension schema', function () {
          expect(ArgSpec.toSchemaRef('bar', DRIVER_TYPE, 'stuff')).to.equal(
            'driver-stuff.json#/properties/bar',
          );
        });
      });
    });

    describe('toSchemaBaseRef()', function () {
      describe('when provided no extension information', function () {
        it('should return the base schema ID', function () {
          expect(ArgSpec.toSchemaBaseRef()).to.equal(
            'appium.json',
          );
        });
      });

      describe('when provided extension information', function () {
        it('should return a schema ID for an extension', function () {
          expect(ArgSpec.toSchemaBaseRef(DRIVER_TYPE, 'stuff')).to.equal(
            'driver-stuff.json',
          );
        });
      });
    });

    describe('toArg()', function () {
      describe('when provided no extension information', function () {
        it('should return a bare arg name', function () {
          expect(ArgSpec.toArg('foo')).to.equal('foo');
        });
      });

      describe('when provided extension information', function () {
        it('should return an extension-specific arg name', function () {
          expect(ArgSpec.toArg('no-oats', DRIVER_TYPE, 'bad-donkey')).to.equal(
            'driver-bad-donkey-no-oats',
          );
        });
      });
    });

    describe('extensionInfoFromRootSchemaId()', function () {
      describe('when provided the base schema ID', function () {
        it('should return an empty object', function () {
          expect(ArgSpec.extensionInfoFromRootSchemaId('appium.json')).to.be
            .empty;
        });
      });

      describe('when provided the schema ID of an extension schema', function () {
        expect(
          ArgSpec.extensionInfoFromRootSchemaId('driver-stuff.json'),
        ).to.eql({extType: DRIVER_TYPE, normalizedExtName: 'stuff'});
      });
    });
  });
});
