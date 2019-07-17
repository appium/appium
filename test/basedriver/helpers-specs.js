import { isPackageOrBundle, duplicateKeys, parseCapsArray } from '../../lib/basedriver/helpers';
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

  describe('#duplicateKeys', function () {
    it('should translate key in an object', function () {
      duplicateKeys({'foo': 'hello world'}, 'foo', 'bar').should.eql({'foo': 'hello world', 'bar': 'hello world'});
    });
    it('should translate key in an object within an object', function () {
      duplicateKeys({'key': {'foo': 'hello world'}}, 'foo', 'bar').should.eql({'key': {'foo': 'hello world', 'bar': 'hello world'}});
    });
    it('should translate key in an object with an array', function () {
      duplicateKeys([
        {'key': {'foo': 'hello world'}},
        {'foo': 'HELLO WORLD'}
      ], 'foo', 'bar').should.eql([
        {'key': {'foo': 'hello world', 'bar': 'hello world'}},
        {'foo': 'HELLO WORLD', 'bar': 'HELLO WORLD'}
      ]);
    });
    it('should duplicate both keys', function () {
      duplicateKeys({
        'keyOne': {
          'foo': 'hello world',
        },
        'keyTwo': {
          'bar': 'HELLO WORLD',
        },
      }, 'foo', 'bar').should.eql({
        'keyOne': {
          'foo': 'hello world',
          'bar': 'hello world',
        },
        'keyTwo': {
          'bar': 'HELLO WORLD',
          'foo': 'HELLO WORLD',
        }
      });
    });
    it('should not do anything to primitives', function () {
      [0, 1, -1, true, false, null, undefined, '', 'Hello World'].forEach((item) => {
        should.equal(duplicateKeys(item), item);
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
        {'foo': 'bar', 'FOO': 'bar'},
        {
          hello: {
            world: {
              'foo': 'BAR',
              'FOO': 'BAR',
            }
          },
          foo: 'bahr',
          FOO: 'bahr'
        },
        'foo',
        null,
        0
      ];
      duplicateKeys(input, 'foo', 'FOO').should.deep.equal(expectedOutput);
    });
  });
});

describe('parseCapsArray', function () {
  it('should parse string into array', function () {
    parseCapsArray('/tmp/my/app.zip').should.eql(['/tmp/my/app.zip']);
  });
  it('should parse array into array', function () {
    parseCapsArray('["/tmp/my/app.zip"]').should.eql(['/tmp/my/app.zip']);
    parseCapsArray('["/tmp/my/app.zip","/tmp/my/app2.zip"]').should.eql([
      '/tmp/my/app.zip',
      '/tmp/my/app2.zip'
    ]);
  });
});
