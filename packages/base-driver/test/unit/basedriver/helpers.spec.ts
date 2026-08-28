import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {duplicateKeys, isPackageOrBundle, parseCapsArray} from '../../../lib/basedriver/helpers.js';

describe('helpers', function () {
  describe('#isPackageOrBundle', function () {
    it('should accept packages and bundles', function () {
      assert.strictEqual(isPackageOrBundle('io.appium.testapp'), true);
    });
    it('should not accept non-packages or non-bundles', function () {
      assert.strictEqual(isPackageOrBundle('foo'), false);
      assert.strictEqual(isPackageOrBundle('/path/to/an.app'), false);
      assert.strictEqual(isPackageOrBundle('/path/to/an.apk'), false);
    });
  });

  describe('#duplicateKeys', function () {
    it('should translate key in an object', function () {
      assert.deepStrictEqual(duplicateKeys({foo: 'hello world'}, 'foo', 'bar'), {
        foo: 'hello world',
        bar: 'hello world',
      });
    });
    it('should translate key in an object within an object', function () {
      assert.deepStrictEqual(duplicateKeys({key: {foo: 'hello world'}}, 'foo', 'bar'), {
        key: {foo: 'hello world', bar: 'hello world'},
      });
    });
    it('should translate key in an object with an array', function () {
      assert.deepStrictEqual(duplicateKeys([{key: {foo: 'hello world'}}, {foo: 'HELLO WORLD'}], 'foo', 'bar'), [
        {key: {foo: 'hello world', bar: 'hello world'}},
        {foo: 'HELLO WORLD', bar: 'HELLO WORLD'},
      ]);
    });
    it('should duplicate both keys', function () {
      assert.deepStrictEqual(
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
          'bar',
        ),
        {
          keyOne: {
            foo: 'hello world',
            bar: 'hello world',
          },
          keyTwo: {
            bar: 'HELLO WORLD',
            foo: 'HELLO WORLD',
          },
        },
      );
    });
    it('should not do anything to primitives', function () {
      [0, 1, -1, true, false, null, undefined, '', 'Hello World'].forEach((item) => {
        assert.strictEqual((duplicateKeys as any)(item), item);
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
      assert.deepStrictEqual(duplicateKeys(input as any, 'foo', 'FOO'), expectedOutput);
    });
  });
});

describe('parseCapsArray', function () {
  it('should parse string into array', function () {
    assert.deepStrictEqual(parseCapsArray('/tmp/my/app.zip'), ['/tmp/my/app.zip']);
  });
  it('should parse array as string into array', function () {
    assert.deepStrictEqual(parseCapsArray('["/tmp/my/app.zip"]'), ['/tmp/my/app.zip']);
    assert.deepStrictEqual(parseCapsArray('["/tmp/my/app.zip","/tmp/my/app2.zip"]'), [
      '/tmp/my/app.zip',
      '/tmp/my/app2.zip',
    ]);
  });
  it('should return an array without change', function () {
    assert.deepStrictEqual(parseCapsArray(['a', 'b']), ['a', 'b']);
  });
  it('should fail if an invalid JSON array is provided', function () {
    assert.throws(() => parseCapsArray(`['*']`));
  });
});
