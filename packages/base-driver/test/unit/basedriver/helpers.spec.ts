import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
  duplicateKeys,
  filenameFromContentDisposition,
  isPackageOrBundle,
  parseCapsArray,
} from '../../../lib/basedriver/helpers/index.js';

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

describe('filenameFromContentDisposition', function () {
  const cases: [desc: string, header: string, expected: string | undefined][] = [
    ['should read a quoted filename', 'attachment; filename="quoted-app.apk"', 'quoted-app.apk'],
    ['should read an unquoted filename', 'attachment; filename=unquoted-app.apk', 'unquoted-app.apk'],
    [
      'should prefer RFC 5987 filename* over filename',
      `attachment; filename="wrong.apk"; filename*=UTF-8''from-star.apk`,
      'from-star.apk',
    ],
    ['should decode a percent-encoded filename*', `attachment; filename*=UTF-8''My%20App.apk`, 'My App.apk'],
    ['should not let an unquoted token swallow later parameters', 'attachment; filename=app.apk; size=42', 'app.apk'],
    ['should keep a quoted filename containing a semicolon', 'attachment; filename="a;b.apk"', 'a;b.apk'],
    ['should ignore a parameter which merely ends with filename', 'attachment; x-filename=sneaky.apk', undefined],
    ['should return undefined for an empty quoted filename', 'attachment; filename=""', undefined],
    ['should return undefined when filename* is not decodable', `attachment; filename*=UTF-8''%E0%A4%A`, undefined],
    ['should return undefined when the header has no filename', 'attachment', undefined],
  ];
  for (const [desc, header, expected] of cases) {
    it(desc, function () {
      assert.strictEqual(filenameFromContentDisposition(header), expected);
    });
  }
});
