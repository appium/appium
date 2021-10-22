import {ArgSpec} from '../../lib/schema/arg-spec';

const {expect} = chai;

describe('ArgSpec', function () {
  describe('class method', function () {
    describe('create()', function () {
      it('should return a new ArgSpec', function () {
        expect(ArgSpec.create('foo')).to.be.an.instanceof(ArgSpec);
      });
    });

    describe('toSchemaId()', function () {
      describe('when provided no extension information', function () {
        it('should return a schema ID for a specific argument', function () {
          expect(ArgSpec.toSchemaId('foo')).to.equal(
            'appium.json#/properties/server/properties/foo',
          );
        });
      });

      describe('when provided extension information', function () {
        it('should return a schema ID for a specific argument within an extension schema', function () {
          expect(ArgSpec.toSchemaId('bar', 'driver', 'stuff')).to.equal(
            'driver-stuff.json#/properties/bar',
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
          expect(ArgSpec.toArg('no-oats', 'driver', 'bad-donkey')).to.equal(
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
        ).to.eql({extType: 'driver', normalizedExtName: 'stuff'});
      });
    });
  });
});
