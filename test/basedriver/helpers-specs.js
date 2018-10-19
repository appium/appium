import { isPackageOrBundle, renameKey } from '../../lib/basedriver/helpers';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';


chai.use(chaiAsPromised);
const should = chai.should();

describe('helpers', function () {
  describe('#isPackageOrBundle', function () {
    it('should accept packages and bundles', function () {
      isPackageOrBundle('io.appium.testapp').should.be.true;
    });
    it('should not accept non-packages or non-bundles', function () {
      isPackageOrBundle('foo').should.be.false;
      isPackageOrBundle('/path/to/an.app').should.be.false;
      isPackageOrBundle('/path/to/an.apk').should.be.false;
    });
  });

  describe('#renameKey', function () {
    it('should translate key in an object', function () {
      renameKey({'foo': 'hello world'}, 'foo', 'bar').should.eql({'bar': 'hello world'});
    });
    it('should translate key in an object within an object', function () {
      renameKey({'key': {'foo': 'hello world'}}, 'foo', 'bar').should.eql({'key': {'bar': 'hello world'}});
    });
    it('should translate key in an object with an array', function () {
      renameKey([
        {'key': {'foo': 'hello world'}},
        {'foo': 'HELLO WORLD'}
      ], 'foo', 'bar').should.eql([
        {'key': {'bar': 'hello world'}},
        {'bar': 'HELLO WORLD'}
      ]);
    });
    it('should not do anything to primitives', function () {
      [0, 1, -1, true, false, null, undefined, "", "Hello World"].forEach((item) => {
        should.equal(renameKey(item), item);
      });
    });
    it('should rename keys on big complex objects', function () {
      const input = [
        {'foo': 'bar'},
        {
          hello: {
            world: {
              'foo': 'BAR',
            }
          },
          foo: 'bahr'
        },
        'foo',
        null,
        0
      ];
      const expectedOutput = [
        {'FOO': 'bar'},
        {
          hello: {
            world: {
              'FOO': 'BAR',
            }
          },
          FOO: 'bahr'
        },
        'foo',
        null,
        0
      ];
      renameKey(input, 'foo', 'FOO').should.deep.equal(expectedOutput);
    });
  });
});
