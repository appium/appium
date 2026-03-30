import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  isPackageOrBundle,
  duplicateKeys,
  parseCapsArray,
} from '../../../lib/basedriver/helpers';

chai.use(chaiAsPromised);

describe('helpers', function () {
  describe('#isPackageOrBundle', function () {
    it('should accept packages and bundles', function () {
      expect(isPackageOrBundle('io.appium.testapp')).to.be.true;
    });
    it('should not accept non-packages or non-bundles', function () {
      expect(isPackageOrBundle('foo')).to.be.false;
      expect(isPackageOrBundle('/path/to/an.app')).to.be.false;
      expect(isPackageOrBundle('/path/to/an.apk')).to.be.false;
    });
  });

  describe('#duplicateKeys', function () {
    it('should translate key in an object', function () {
      expect(duplicateKeys({foo: 'hello world'}, 'foo', 'bar')).to.eql({
        foo: 'hello world',
        bar: 'hello world',
      });
    });
    it('should translate key in an object within an object', function () {
      expect(duplicateKeys({key: {foo: 'hello world'}}, 'foo', 'bar')).to.eql({
        key: {foo: 'hello world', bar: 'hello world'},
      });
    });
    it('should translate key in an object with an array', function () {
      expect(
        duplicateKeys([{key: {foo: 'hello world'}}, {foo: 'HELLO WORLD'}], 'foo', 'bar')
      ).to.eql([
        {key: {foo: 'hello world', bar: 'hello world'}},
        {foo: 'HELLO WORLD', bar: 'HELLO WORLD'},
      ]);
    });
    it('should duplicate both keys', function () {
      expect(
        duplicateKeys(
          {
            keyOne: {
              foo: 'hello world',
            },
            keyTwo: {
              bar: 'HELLO WORLD',
            },
          },
          'foo',
          'bar'
        )
      ).to.eql({
        keyOne: {
          foo: 'hello world',
          bar: 'hello world',
        },
        keyTwo: {
          bar: 'HELLO WORLD',
          foo: 'HELLO WORLD',
        },
      });
    });
    it('should not do anything to primitives', function () {
      [0, 1, -1, true, false, null, undefined, '', 'Hello World'].forEach((item) => {
        expect((duplicateKeys as any)(item)).to.equal(item);
      });
    });
    it('should rename keys on big complex objects', function () {
      const input = [
        {foo: 'bar'},
        {
          hello: {
            world: {
              foo: 'BAR',
            },
          },
          foo: 'bahr',
        },
        'foo',
        null,
        0,
      ];
      const expectedOutput = [
        {foo: 'bar', FOO: 'bar'},
        {
          hello: {
            world: {
              foo: 'BAR',
              FOO: 'BAR',
            },
          },
          foo: 'bahr',
          FOO: 'bahr',
        },
        'foo',
        null,
        0,
      ];
      expect(duplicateKeys(input as any, 'foo', 'FOO')).to.deep.equal(expectedOutput);
    });
  });
});

describe('parseCapsArray', function () {
  it('should parse string into array', function () {
    expect(parseCapsArray('/tmp/my/app.zip')).to.eql(['/tmp/my/app.zip']);
  });
  it('should parse array as string into array', function () {
    expect(parseCapsArray('["/tmp/my/app.zip"]')).to.eql(['/tmp/my/app.zip']);
    expect(parseCapsArray('["/tmp/my/app.zip","/tmp/my/app2.zip"]')).to.eql([
      '/tmp/my/app.zip',
      '/tmp/my/app2.zip',
    ]);
  });
  it('should return an array without change', function () {
    expect(parseCapsArray(['a', 'b'])).to.eql(['a', 'b']);
  });
  it('should fail if an invalid JSON array is provided', function () {
    expect(() => parseCapsArray(`['*']`)).to.throw();
  });
});
