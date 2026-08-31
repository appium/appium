import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {after, afterEach, before, beforeEach, describe, it} from 'node:test';

import {sleep} from 'asyncbox';
import {createSandbox} from 'sinon';

import {fs, tempDir, util} from '../../lib';

const {W3C_WEB_ELEMENT_IDENTIFIER} = util;

describe('util', function () {
  let sandbox: ReturnType<typeof createSandbox>;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('hasValue', function () {
    it('should exist', function () {
      assert.ok(util.hasValue);
    });

    it('should handle undefined', function () {
      assert.strictEqual(util.hasValue(undefined as any), false);
    });

    it('should handle not a number', function () {
      assert.strictEqual(util.hasValue(NaN as any), false);
    });

    it('should handle null', function () {
      assert.strictEqual(util.hasValue(null as any), false);
    });

    it('should handle functions', function () {
      assert.strictEqual(util.hasValue(function () {} as any), true);
    });

    it('should handle empty arrays', function () {
      assert.strictEqual(util.hasValue({} as any), true);
    });

    it('should handle zero', function () {
      assert.strictEqual(util.hasValue(0 as any), true);
    });

    it('should handle simple string', function () {
      assert.strictEqual(util.hasValue('string'), true);
    });

    it('should handle booleans', function () {
      assert.strictEqual(util.hasValue(false as any), true);
    });

    it('should handle empty strings', function () {
      assert.strictEqual(util.hasValue(''), true);
    });
  });

  describe('hasContent', function () {
    it('should exist', function () {
      assert.ok(util.hasContent);
    });

    it('should handle undefined', function () {
      assert.strictEqual(util.hasContent(undefined as any), false);
    });

    it('should handle not a number', function () {
      assert.strictEqual(util.hasContent(NaN as any), false);
    });

    it('should handle null', function () {
      assert.strictEqual(util.hasContent(null as any), false);
    });

    it('should handle functions', function () {
      assert.strictEqual(util.hasContent(function () {} as any), false);
    });

    it('should handle empty arrays', function () {
      assert.strictEqual(util.hasContent({} as any), false);
    });

    it('should handle zero', function () {
      assert.strictEqual(util.hasContent(0 as any), false);
    });

    it('should handle simple string', function () {
      assert.strictEqual(util.hasContent('string'), true);
    });

    it('should handle booleans', function () {
      assert.strictEqual(util.hasContent(false as any), false);
    });

    it('should handle empty strings', function () {
      assert.strictEqual(util.hasContent(''), false);
    });
  });

  describe('escapeSpace', function () {
    it('should do nothing to a string without space', function () {
      const actual = 'appium';
      const expected = 'appium';
      assert.strictEqual(util.escapeSpace(actual), expected);
    });

    it('should do escape spaces', function () {
      const actual = '/Applications/ Xcode 6.1.1.app/Contents/Developer';
      const expected = '/Applications/\\ Xcode\\ 6.1.1.app/Contents/Developer';
      assert.strictEqual(util.escapeSpace(actual), expected);
    });

    it('should escape consecutive spaces', function () {
      const actual = 'appium   space';
      const expected = 'appium\\ \\ \\ space';
      assert.strictEqual(util.escapeSpace(actual), expected);
    });
  });

  describe('localIp', function () {
    it('should find a local ip address', function () {
      const ifConfigOut: any = {
        lo0: [
          {
            address: '::1',
            netmask: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
            family: 'IPv6',
            mac: '00:00:00:00:00:00',
            scopeid: 0,
            internal: true,
          },
          {
            address: '127.0.0.1',
            netmask: '255.0.0.0',
            family: 'IPv4',
            mac: '00:00:00:00:00:00',
            internal: true,
          },
          {
            address: 'fe80::1',
            netmask: 'ffff:ffff:ffff:ffff::',
            family: 'IPv6',
            mac: '00:00:00:00:00:00',
            scopeid: 1,
            internal: true,
          },
        ],
        en0: [
          {
            address: 'xxx',
            netmask: 'ffff:ffff:ffff:ffff::',
            family: 'IPv6',
            mac: 'd0:e1:40:93:56:9a',
            scopeid: 4,
            internal: false,
          },
          {
            address: '123.123.123.123',
            netmask: '255.255.254.0',
            family: 'IPv4',
            mac: 'xxx',
            internal: false,
          },
        ],
        awdl0: [
          {
            address: 'xxx',
            netmask: 'ffff:ffff:ffff:ffff::',
            family: 'IPv6',
            mac: 'xxx',
            scopeid: 7,
            internal: false,
          },
        ],
      };
      const osMock = sandbox.mock(os);
      osMock.expects('networkInterfaces').returns(ifConfigOut);
      const ip = util.localIp();
      assert.strictEqual(ip, '123.123.123.123');
      osMock.verify();
    });
  });

  describe('cancellableDelay', function () {
    it('should delay', async function () {
      await util.cancellableDelay(10);
    });
    it('cancel should work', async function () {
      const delay = util.cancellableDelay(1000);
      await sleep(10);
      delay.cancel();
      await assert.rejects(delay, /cancellation error/);
    });
  });

  describe('safeJsonParse', function () {
    it('should pass object through', function () {
      const obj = {a: 'a', b: 'b'};
      assert.strictEqual(util.safeJsonParse(obj), obj);
    });
    it('should correctly parse json string', function () {
      const obj = {a: 'a', b: 'b'};
      assert.deepStrictEqual(util.safeJsonParse(JSON.stringify(obj)), obj);
    });
    it('should pass an array through', function () {
      const arr = ['a', 'b'];
      assert.deepStrictEqual(util.safeJsonParse(arr), arr);
    });
    it('should correctly parse json array', function () {
      const arr = ['a', 'b'];
      assert.deepStrictEqual(util.safeJsonParse(JSON.stringify(arr)), arr);
    });
    it('should pass null through', function () {
      const obj = null;
      assert.strictEqual(util.safeJsonParse(obj), null);
    });
    it('should pass simple string through', function () {
      const str = 'str';
      assert.strictEqual(util.safeJsonParse(str), str);
    });
    it('should pass a number through', function () {
      const num = 42;
      assert.strictEqual(util.safeJsonParse(num), num);
    });
    it('should make a number from a string representation', function () {
      const num = 42;
      assert.strictEqual(util.safeJsonParse(String(num)), num);
    });
  });

  describe('jsonStringify', function () {
    it('should use JSON.stringify if no Buffer involved', function () {
      const obj = {k1: 'v1', k2: 'v2', k3: 'v3'};
      const jsonString = JSON.stringify(obj, null, 2);
      assert.strictEqual(util.jsonStringify(obj), jsonString);
    });
    it('should serialize a Buffer', function () {
      const obj = {
        k1: 'v1',
        k2: 'v2',
        k3: Buffer.from('hi how are you today'),
      };
      assert.ok(util.jsonStringify(obj).includes('hi how are you today'));
    });
    it('should use the replacer function on non-buffer values', function () {
      const obj = {k1: 'v1', k2: 'v2', k3: 'v3'};
      function replacer(_key: string, value: any) {
        return typeof value === 'string' ? value.toUpperCase() : value;
      }
      const jsonString = util.jsonStringify(obj, replacer);
      assert.ok(jsonString.includes('V1'));
      assert.ok(jsonString.includes('V2'));
      assert.ok(jsonString.includes('V3'));
    });
    it('should use the replacer function on buffers', function () {
      const obj = {
        k1: 'v1',
        k2: 'v2',
        k3: Buffer.from('hi how are you today'),
      };
      function replacer(_key: string, value: any) {
        return typeof value === 'string' ? value.toUpperCase() : value;
      }
      const jsonString = util.jsonStringify(obj, replacer);
      assert.ok(jsonString.includes('V1'));
      assert.ok(jsonString.includes('V2'));
      assert.ok(jsonString.includes('HI HOW ARE YOU TODAY'));
    });
    it('should use the replacer function recursively', function () {
      const obj = {
        k1: 'v1',
        k2: 'v2',
        k3: Buffer.from('hi how are you today'),
        k4: {k5: 'v5'},
      };
      function replacer(_key: string, value: any) {
        return typeof value === 'string' ? value.toUpperCase() : value;
      }
      const jsonString = util.jsonStringify(obj, replacer);
      assert.ok(jsonString.includes('V1'));
      assert.ok(jsonString.includes('V2'));
      assert.ok(jsonString.includes('HI HOW ARE YOU TODAY'));
      assert.ok(jsonString.includes('V5'));
    });
  });

  describe('unwrapElement', function () {
    it('should pass through an unwrapped element', function () {
      const el = 4;
      assert.strictEqual(util.unwrapElement(el as any), el);
    });
    it('should not throw for null element input', function () {
      assert.strictEqual(util.unwrapElement(null as any), null);
    });
    it('should pass through an element that is an object', function () {
      const el = {RANDOM: 4};
      assert.strictEqual(util.unwrapElement(el as any), el);
    });
    it('should unwrap a wrapped element', function () {
      const el = {ELEMENT: 4};
      assert.strictEqual(util.unwrapElement(el as any), 4);
    });
    it('should unwrap a wrapped element that uses W3C element identifier', function () {
      const el = {[W3C_WEB_ELEMENT_IDENTIFIER]: 5};
      assert.strictEqual(util.unwrapElement(el as any), 5);
    });
    it('should unwrap a wrapped element and prioritize W3C element identifier', function () {
      const el = {ELEMENT: 7, [W3C_WEB_ELEMENT_IDENTIFIER]: 6};
      assert.strictEqual(util.unwrapElement(el as any), 6);
    });
  });

  describe('wrapElement', function () {
    it('should include ELEMENT and w3c element', function () {
      assert.deepStrictEqual(util.wrapElement(123 as any), {
        [util.W3C_WEB_ELEMENT_IDENTIFIER]: 123,
        ELEMENT: 123,
      });
    });
  });

  describe('toReadableSizeString', function () {
    it('should fail if cannot convert to Bytes', function () {
      assert.throws(() => util.toReadableSizeString('asdasd'), /Cannot convert/);
    });
    it('should properly convert to Bytes', function () {
      assert.strictEqual(util.toReadableSizeString(0), '0 B');
    });
    it('should properly convert to KBytes', function () {
      assert.strictEqual(util.toReadableSizeString((2048 + 12) as any), '2.01 KB');
    });
    it('should properly convert to MBytes', function () {
      assert.strictEqual(util.toReadableSizeString((1024 * 1024 * 3 + 1024 * 10) as any), '3.01 MB');
    });
    it('should properly convert to GBytes', function () {
      assert.strictEqual(util.toReadableSizeString((1024 * 1024 * 1024 * 5) as any), '5.00 GB');
    });
  });

  describe('filterObject', function () {
    describe('with undefined predicate', function () {
      it('should filter out undefineds', function () {
        const obj = {a: 'a', b: 'b', c: undefined};
        assert.deepStrictEqual(util.filterObject(obj), {a: 'a', b: 'b'});
      });
      it('should leave nulls alone', function () {
        const obj = {a: 'a', b: 'b', c: null};
        assert.deepStrictEqual(util.filterObject(obj), {a: 'a', b: 'b', c: null});
      });
    });
    describe('with value predicate', function () {
      it('should filter elements by their value', function () {
        const obj = {a: 'a', b: 'b', c: 'c', d: 'a'};
        assert.deepStrictEqual(util.filterObject(obj, 'a'), {a: 'a', d: 'a'});
      });
    });
    describe('with function predicate', function () {
      it('should filter elements', function () {
        const obj = {a: 'a', b: 'b', c: 'c'};
        assert.deepStrictEqual(
          util.filterObject(obj, (v: unknown) => v === 'a' || v === 'c'),
          {
            a: 'a',
            c: 'c',
          },
        );
      });
    });
  });

  describe('isSubPath', function () {
    it('should detect simple subpath', function () {
      assert.strictEqual(util.isSubPath('/root/some', '/root'), true);
    });
    it('should detect complex subpath', function () {
      assert.strictEqual(util.isSubPath('/root/some/other/../../.', '/root'), true);
    });
    it('should detect subpath ending with a slash', function () {
      assert.strictEqual(util.isSubPath('/root/some/', '/root'), true);
    });
    it('should detect if a path is not a subpath', function () {
      assert.strictEqual(util.isSubPath('/root/some//../..', '/root'), false);
    });
    it('should not detect a sibling whose name starts with the root name', function () {
      assert.strictEqual(util.isSubPath('/root-backup/some', '/root'), false);
      assert.strictEqual(util.isSubPath('/rootly', '/root'), false);
    });
    it('should detect a subpath whose name starts with a dot', function () {
      assert.strictEqual(util.isSubPath('/root/..some', '/root'), true);
    });
    it('should throw if any of the given paths is not absolute', function () {
      assert.throws(() => util.isSubPath('some/..', '/root'), /absolute/);
    });
  });

  describe('isSameDestination', function () {
    let path1: string;
    let path2: string;
    let tmpDir: string;
    before(async function () {
      tmpDir = await tempDir.openDir();
      path1 = path.resolve(tmpDir, 'path1.txt');
      path2 = path.resolve(tmpDir, 'path2.txt');
      for (const p of [path1, path2]) {
        await fs.writeFile(p, p, 'utf8');
      }
    });
    after(async function () {
      await fs.rimraf(tmpDir);
    });
    it('should match paths to the same file/folder', async function () {
      assert.strictEqual(
        await util.isSameDestination(path1, path.resolve(tmpDir, '..', path.basename(tmpDir), path.basename(path1))),
        true,
      );
    });
    it('should not match paths if they point to non existing items', async function () {
      assert.strictEqual(await util.isSameDestination(path1, 'blabla'), false);
    });
    it('should not match paths to different files', async function () {
      assert.strictEqual(await util.isSameDestination(path1, path2), false);
    });
  });

  describe('compareVersions', function () {
    it('should compare two correct version numbers', function () {
      assert.strictEqual(util.compareVersions('10.0', '<', '11.0'), true);
      assert.strictEqual(util.compareVersions('11.0', '>=', '11.0'), true);
      assert.strictEqual(util.compareVersions('11.0', '==', '11.0'), true);
      assert.strictEqual(util.compareVersions('13.10', '>', '13.5'), true);
      assert.strictEqual(util.compareVersions('11.1', '!=', '11.10'), true);
      assert.strictEqual(util.compareVersions('12.0', '<', 10 as any), false);
    });
    it('should throw if any of version arguments is invalid', function () {
      assert.throws(() => util.compareVersions(undefined as any, '<', '11.0'));
      assert.throws(() => util.compareVersions('11.0', '==', null as any));
    });
    it('should throw if comparison operator is unsupported', function () {
      assert.throws(() => util.compareVersions('12.0', 'abc', 10 as any));
    });
  });

  describe('quote', function () {
    it('should quote a string with a space', function () {
      assert.strictEqual(util.quote(['a', 'b', 'c d']), "a b 'c d'");
    });
    it('should escape double quotes', function () {
      assert.strictEqual(util.quote(['a', 'b', `it's a "neat thing"`]), `a b "it's a \\"neat thing\\""`);
    });
    it("should escape $ ` and '", function () {
      assert.strictEqual(util.quote(['$', '`', `'`]), '\\$ \\` "\'"');
    });
    it('should handle empty array', function () {
      assert.strictEqual(util.quote([]), '');
    });
    it('should quote a string with newline', function () {
      assert.strictEqual(util.quote(['a\nb']), `'a\nb'`);
    });
    it('should stringify booleans', function () {
      assert.strictEqual(util.quote(['a', 1, true, false] as any), 'a 1 true false');
    });
    it('should stringify null and undefined', function () {
      assert.strictEqual(util.quote(['a', 1, null, undefined] as any), 'a 1 null undefined');
    });
  });

  describe('pluralize', function () {
    it('should pluralize a string', function () {
      assert.strictEqual(util.pluralize('word', 2), 'words');
    });
    it('should pluralize a string and prepend the number through boolean', function () {
      assert.strictEqual(util.pluralize('word', 2, true), '2 words');
    });
    it('should pluralize a string and prepend the number through options', function () {
      assert.strictEqual(util.pluralize('word', 2, {inclusive: true}), '2 words');
    });
  });

  describe('memoize', function () {
    it('should memoize using first argument by default', function () {
      let callCount = 0;
      const fn = util.memoize((value: number) => {
        callCount += 1;
        return value * 2;
      });
      assert.strictEqual(fn(2), 4);
      assert.strictEqual(fn(2), 4);
      assert.strictEqual(callCount, 1);
    });

    it('should memoize by first argument only', function () {
      let callCount = 0;
      const fn = util.memoize((a: number, b: number) => {
        callCount += 1;
        return a + b;
      });
      assert.strictEqual(fn(1, 2), 3);
      assert.strictEqual(fn(1, 999), 3);
      assert.strictEqual(callCount, 1);
    });

    it('should memoize using a custom resolver', function () {
      let callCount = 0;
      const fn = util.memoize(
        (a: number, b: number) => {
          callCount += 1;
          return a + b;
        },
        (_a, b) => b,
      );
      assert.strictEqual(fn(1, 2), 3);
      assert.strictEqual(fn(999, 2), 3);
      assert.strictEqual(callCount, 1);
    });

    it('should use resolver keys to isolate cache entries', function () {
      let callCount = 0;
      const fn = util.memoize(
        (value: number) => {
          callCount += 1;
          return value * 10;
        },
        (value) => value % 2,
      );
      assert.strictEqual(fn(2), 20);
      assert.strictEqual(fn(4), 20);
      assert.strictEqual(fn(3), 30);
      assert.strictEqual(fn(5), 30);
      assert.strictEqual(callCount, 2);
    });

    it('should preserve this for resolver and wrapped function', function () {
      const obj = {
        prefix: 'ctx',
        calls: 0,
        fn: util.memoize(
          function (this: {prefix: string; calls: number}, value: number) {
            this.calls += 1;
            return `${this.prefix}:${value}`;
          },
          function (this: {prefix: string}, value: number) {
            return `${this.prefix}-${value}`;
          },
        ),
      };

      assert.strictEqual(obj.fn(1), 'ctx:1');
      assert.strictEqual(obj.fn(1), 'ctx:1');
      assert.strictEqual(obj.calls, 1);
    });
  });

  describe('isPlainObject', function () {
    it('should return true for plain objects', function () {
      assert.strictEqual(util.isPlainObject({}), true);
      assert.strictEqual(util.isPlainObject(Object.create(null)), true);
    });

    it('should return false for non-plain objects', function () {
      assert.strictEqual(util.isPlainObject([]), false);
      assert.strictEqual(util.isPlainObject(new Date()), false);
      assert.strictEqual(util.isPlainObject(null), false);
    });

    it('should match lodash behavior for edge cases', function () {
      const spoofed = {a: 1, [Symbol.toStringTag]: 'Custom'};
      assert.strictEqual(util.isPlainObject(spoofed), true);

      function CustomCtor(this: any) {
        this.a = 1;
      }
      const withCustomCtorOnProto = Object.create({constructor: CustomCtor});
      assert.strictEqual(util.isPlainObject(withCustomCtorOnProto), false);
    });
  });

  describe('isEmpty', function () {
    it('should handle strings and arrays', function () {
      assert.strictEqual(util.isEmpty(''), true);
      assert.strictEqual(util.isEmpty('x'), false);
      assert.strictEqual(util.isEmpty([]), true);
      assert.strictEqual(util.isEmpty([1]), false);
    });

    it('should handle objects and collections', function () {
      assert.strictEqual(util.isEmpty({}), true);
      assert.strictEqual(util.isEmpty({a: 1}), false);
      assert.strictEqual(util.isEmpty(new Map()), true);
      assert.strictEqual(util.isEmpty(new Set([1])), false);
    });

    it('should handle non-plain objects with enumerable own properties', function () {
      class Thing {}
      const emptyInstance = new Thing();
      const nonEmptyInstance = new Thing();
      (nonEmptyInstance as unknown as {a?: number}).a = 1;
      assert.strictEqual(util.isEmpty(emptyInstance), true);
      assert.strictEqual(util.isEmpty(nonEmptyInstance), false);

      const fn = () => undefined;
      (fn as unknown as {x?: number}).x = 1;
      assert.strictEqual(util.isEmpty(fn), false);
    });
  });

  describe('isEqual', function () {
    it('should deeply compare nested objects', function () {
      assert.strictEqual(util.isEqual({a: [1, {b: 'c'}]}, {a: [1, {b: 'c'}]}), true);
      assert.strictEqual(util.isEqual({a: [1, {b: 'c'}]}, {a: [1, {b: 'd'}]}), false);
    });

    it('should compare special values and typed objects', function () {
      assert.strictEqual(util.isEqual(NaN, NaN), true);
      assert.strictEqual(util.isEqual(new Date('2020-01-01'), new Date('2020-01-01')), true);
      assert.strictEqual(util.isEqual(/abc/gi, /abc/gi), true);
      assert.strictEqual(util.isEqual(Buffer.from('a'), Buffer.from('a')), true);
    });

    it('should compare maps and sets', function () {
      const entries: Array<[string, number | {c: number}]> = [
        ['a', 1],
        ['b', {c: 2}],
      ];
      assert.strictEqual(util.isEqual(new Map(entries), new Map(entries)), true);
      assert.strictEqual(util.isEqual(new Set([1, 2]), new Set([2, 1])), true);
      assert.strictEqual(util.isEqual(new Set([1, 2]), new Set([2, 3])), false);
    });

    it('should compare functions by identity only', function () {
      const fn1 = () => 1;
      const fn2 = () => 1;
      (fn1 as any).x = 1;
      (fn2 as any).x = 1;
      assert.strictEqual(util.isEqual(fn1, fn1), true);
      assert.strictEqual(util.isEqual(fn1, fn2), false);
    });

    it('should ignore non-enumerable own properties', function () {
      const left: Record<string, unknown> = {a: 1};
      const right: Record<string, unknown> = {a: 1};
      Object.defineProperty(left, 'hidden', {value: 1, enumerable: false});
      Object.defineProperty(right, 'hidden', {value: 2, enumerable: false});
      assert.strictEqual(util.isEqual(left, right), true);
    });

    it('should compare errors and boxed symbols like lodash', function () {
      assert.strictEqual(util.isEqual(new Error('boom'), new Error('boom')), true);
      assert.strictEqual(util.isEqual(new Error('boom'), new Error('kaboom')), false);
      assert.strictEqual(util.isEqual(Object(Symbol.for('x')), Object(Symbol.for('x'))), true);
      assert.strictEqual(util.isEqual(Object(Symbol.for('x')), Object(Symbol.for('y'))), false);
    });
  });

  describe('escapeRegExp', function () {
    it('should escape regexp metacharacters', function () {
      assert.strictEqual(
        util.escapeRegExp('a+b*c?.(x)[y]{z}|^$\\'),
        'a\\+b\\*c\\?\\.\\(x\\)\\[y\\]\\{z\\}\\|\\^\\$\\\\',
      );
    });
  });

  describe('uniq', function () {
    it('should return a duplicate-free array preserving order', function () {
      assert.deepStrictEqual(util.uniq([1, 2, 1, 3, 2]), [1, 2, 3]);
    });
  });

  describe('truncateString', function () {
    it('should not change short strings', function () {
      assert.strictEqual(util.truncateString('short'), 'short');
    });

    it('should truncate with default options', function () {
      const src = 'abcdefghijklmnopqrstuvwxyz0123456789';
      assert.strictEqual(util.truncateString(src), 'abcdefghijklmnopqrstuvwxyz012…');
    });

    it('should support numeric length shorthand', function () {
      assert.strictEqual(util.truncateString('abcdefghijklmnopqrstuvwxyz', 10), 'abcdefghi…');
    });

    it('should support custom omission', function () {
      assert.strictEqual(util.truncateString('abcdefghijklmnopqrstuvwxyz', {length: 10, omission: '..'}), 'abcdefgh..');
    });

    it('should handle non-string values safely', function () {
      assert.doesNotThrow(() => util.truncateString(undefined as any));
      assert.doesNotThrow(() => util.truncateString(null as any));
      assert.strictEqual(util.truncateString(undefined as any), '');
      assert.strictEqual(util.truncateString(null as any), '');
      assert.strictEqual(util.truncateString(123456 as any, 5), '1234…');
      assert.strictEqual(util.truncateString({a: 1} as any, 8), '[object…');
      assert.strictEqual(util.truncateString(-0 as any), '-0');
    });

    it('should return omission if max length is too small', function () {
      assert.strictEqual(util.truncateString('hello world', 0), '…');
    });
  });
});
