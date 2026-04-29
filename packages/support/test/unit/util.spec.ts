import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {util, fs, tempDir} from '../../lib';
import {sleep} from 'asyncbox';
import {createSandbox} from 'sinon';
import os from 'node:os';
import path from 'node:path';
import _ from 'lodash';

const {W3C_WEB_ELEMENT_IDENTIFIER} = util;

describe('util', function () {
  let sandbox: ReturnType<typeof createSandbox>;

  before(function () {
    use(chaiAsPromised);
  });

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('hasValue', function () {
    it('should exist', function () {
      expect(util.hasValue).to.exist;
    });

    it('should handle undefined', function () {
      expect(util.hasValue(undefined as any)).to.be.false;
    });

    it('should handle not a number', function () {
      expect(util.hasValue(NaN as any)).to.be.false;
    });

    it('should handle null', function () {
      expect(util.hasValue(null as any)).to.be.false;
    });

    it('should handle functions', function () {
      expect(util.hasValue(function () {} as any)).to.be.true;
    });

    it('should handle empty arrays', function () {
      expect(util.hasValue({} as any)).to.be.true;
    });

    it('should handle zero', function () {
      expect(util.hasValue(0 as any)).to.be.true;
    });

    it('should handle simple string', function () {
      expect(util.hasValue('string')).to.be.true;
    });

    it('should handle booleans', function () {
      expect(util.hasValue(false as any)).to.be.true;
    });

    it('should handle empty strings', function () {
      expect(util.hasValue('')).to.be.true;
    });
  });

  describe('hasContent', function () {
    it('should exist', function () {
      expect(util.hasContent).to.exist;
    });

    it('should handle undefined', function () {
      expect(util.hasContent(undefined as any)).to.be.false;
    });

    it('should handle not a number', function () {
      expect(util.hasContent(NaN as any)).to.be.false;
    });

    it('should handle null', function () {
      expect(util.hasContent(null as any)).to.be.false;
    });

    it('should handle functions', function () {
      expect(util.hasContent(function () {} as any)).to.be.false;
    });

    it('should handle empty arrays', function () {
      expect(util.hasContent({} as any)).to.be.false;
    });

    it('should handle zero', function () {
      expect(util.hasContent(0 as any)).to.be.false;
    });

    it('should handle simple string', function () {
      expect(util.hasContent('string')).to.be.true;
    });

    it('should handle booleans', function () {
      expect(util.hasContent(false as any)).to.be.false;
    });

    it('should handle empty strings', function () {
      expect(util.hasContent('')).to.be.false;
    });
  });

  describe('escapeSpace', function () {
    it('should do nothing to a string without space', function () {
      const actual = 'appium';
      const expected = 'appium';
      expect(util.escapeSpace(actual)).to.equal(expected);
    });

    it('should do escape spaces', function () {
      const actual = '/Applications/ Xcode 6.1.1.app/Contents/Developer';
      const expected = '/Applications/\\ Xcode\\ 6.1.1.app/Contents/Developer';
      expect(util.escapeSpace(actual)).to.equal(expected);
    });

    it('should escape consecutive spaces', function () {
      const actual = 'appium   space';
      const expected = 'appium\\ \\ \\ space';
      expect(util.escapeSpace(actual)).to.equal(expected);
    });
  });

  describe('localIp', function () {
    it('should find a local ip address', function () {
      let ifConfigOut: any = {
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
      ifConfigOut = '';
      const ip = util.localIp();
      expect(ip).to.eql('123.123.123.123');
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
      await expect(delay).to.eventually.be.rejectedWith(/cancellation error/);
    });
  });

  describe('safeJsonParse', function () {
    it('should pass object through', function () {
      const obj = {a: 'a', b: 'b'};
      expect(util.safeJsonParse(obj)).to.equal(obj);
    });
    it('should correctly parse json string', function () {
      const obj = {a: 'a', b: 'b'};
      expect(util.safeJsonParse(JSON.stringify(obj))).to.eql(obj);
    });
    it('should pass an array through', function () {
      const arr = ['a', 'b'];
      expect(util.safeJsonParse(arr)).to.eql(arr);
    });
    it('should correctly parse json array', function () {
      const arr = ['a', 'b'];
      expect(util.safeJsonParse(JSON.stringify(arr))).to.eql(arr);
    });
    it('should pass null through', function () {
      const obj = null;
      expect(_.isNull(util.safeJsonParse(obj))).to.be.true;
    });
    it('should pass simple string through', function () {
      const str = 'str';
      expect(util.safeJsonParse(str)).to.eql(str);
    });
    it('should pass a number through', function () {
      const num = 42;
      expect(util.safeJsonParse(num)).to.eql(num);
    });
    it('should make a number from a string representation', function () {
      const num = 42;
      expect(util.safeJsonParse(String(num))).to.eql(num);
    });
  });

  describe('jsonStringify', function () {
    it('should use JSON.stringify if no Buffer involved', function () {
      const obj = {k1: 'v1', k2: 'v2', k3: 'v3'};
      const jsonString = JSON.stringify(obj, null, 2);
      expect(util.jsonStringify(obj)).to.eql(jsonString);
    });
    it('should serialize a Buffer', function () {
      const obj = {
        k1: 'v1',
        k2: 'v2',
        k3: Buffer.from('hi how are you today'),
      };
      expect(util.jsonStringify(obj)).to.include('hi how are you today');
    });
    it('should use the replacer function on non-buffer values', function () {
      const obj = {k1: 'v1', k2: 'v2', k3: 'v3'};
      function replacer(_key: string, value: any) {
        return _.isString(value) ? value.toUpperCase() : value;
      }
      const jsonString = util.jsonStringify(obj, replacer);
      expect(jsonString).to.include('V1');
      expect(jsonString).to.include('V2');
      expect(jsonString).to.include('V3');
    });
    it('should use the replacer function on buffers', function () {
      const obj = {
        k1: 'v1',
        k2: 'v2',
        k3: Buffer.from('hi how are you today'),
      };
      function replacer(_key: string, value: any) {
        return _.isString(value) ? value.toUpperCase() : value;
      }
      const jsonString = util.jsonStringify(obj, replacer);
      expect(jsonString).to.include('V1');
      expect(jsonString).to.include('V2');
      expect(jsonString).to.include('HI HOW ARE YOU TODAY');
    });
    it('should use the replacer function recursively', function () {
      const obj = {
        k1: 'v1',
        k2: 'v2',
        k3: Buffer.from('hi how are you today'),
        k4: {k5: 'v5'},
      };
      function replacer(_key: string, value: any) {
        return _.isString(value) ? value.toUpperCase() : value;
      }
      const jsonString = util.jsonStringify(obj, replacer);
      expect(jsonString).to.include('V1');
      expect(jsonString).to.include('V2');
      expect(jsonString).to.include('HI HOW ARE YOU TODAY');
      expect(jsonString).to.include('V5');
    });
  });

  describe('unwrapElement', function () {
    it('should pass through an unwrapped element', function () {
      const el = 4;
      expect(util.unwrapElement(el as any)).to.equal(el);
    });
    it('should pass through an element that is an object', function () {
      const el = {RANDOM: 4};
      expect(util.unwrapElement(el as any)).to.equal(el);
    });
    it('should unwrap a wrapped element', function () {
      const el = {ELEMENT: 4};
      expect(util.unwrapElement(el as any)).to.eql(4);
    });
    it('should unwrap a wrapped element that uses W3C element identifier', function () {
      const el = {[W3C_WEB_ELEMENT_IDENTIFIER]: 5};
      expect(util.unwrapElement(el as any)).to.eql(5);
    });
    it('should unwrap a wrapped element and prioritize W3C element identifier', function () {
      const el = {ELEMENT: 7, [W3C_WEB_ELEMENT_IDENTIFIER]: 6};
      expect(util.unwrapElement(el as any)).to.eql(6);
    });
  });

  describe('wrapElement', function () {
    it('should include ELEMENT and w3c element', function () {
      expect(util.wrapElement(123 as any)).to.eql({
        [util.W3C_WEB_ELEMENT_IDENTIFIER]: 123,
        ELEMENT: 123,
      });
    });
  });

  describe('toReadableSizeString', function () {
    it('should fail if cannot convert to Bytes', function () {
      expect(() => util.toReadableSizeString('asdasd')).to.throw(/Cannot convert/);
    });
    it('should properly convert to Bytes', function () {
      expect(util.toReadableSizeString(0)).to.equal('0 B');
    });
    it('should properly convert to KBytes', function () {
      expect(util.toReadableSizeString((2048 + 12) as any)).to.equal('2.01 KB');
    });
    it('should properly convert to MBytes', function () {
      expect(util.toReadableSizeString((1024 * 1024 * 3 + 1024 * 10) as any)).to.equal('3.01 MB');
    });
    it('should properly convert to GBytes', function () {
      expect(util.toReadableSizeString((1024 * 1024 * 1024 * 5) as any)).to.equal('5.00 GB');
    });
  });

  describe('filterObject', function () {
    describe('with undefined predicate', function () {
      it('should filter out undefineds', function () {
        const obj = {a: 'a', b: 'b', c: undefined};
        expect(util.filterObject(obj)).to.eql({a: 'a', b: 'b'});
      });
      it('should leave nulls alone', function () {
        const obj = {a: 'a', b: 'b', c: null};
        expect(util.filterObject(obj)).to.eql({a: 'a', b: 'b', c: null});
      });
    });
    describe('with value predicate', function () {
      it('should filter elements by their value', function () {
        const obj = {a: 'a', b: 'b', c: 'c', d: 'a'};
        expect(util.filterObject(obj, 'a')).to.eql({a: 'a', d: 'a'});
      });
    });
    describe('with function predicate', function () {
      it('should filter elements', function () {
        const obj = {a: 'a', b: 'b', c: 'c'};
        expect(util.filterObject(obj, (v) => v === 'a' || v === 'c')).to.eql({a: 'a', c: 'c'});
      });
    });
  });

  describe('isSubPath', function () {
    it('should detect simple subpath', function () {
      expect(util.isSubPath('/root/some', '/root')).to.be.true;
    });
    it('should detect complex subpath', function () {
      expect(util.isSubPath('/root/some/other/../../.', '/root')).to.be.true;
    });
    it('should detect subpath ending with a slash', function () {
      expect(util.isSubPath('/root/some/', '/root')).to.be.true;
    });
    it('should detect if a path is not a subpath', function () {
      expect(util.isSubPath('/root/some//../..', '/root')).to.be.false;
    });
    it('should throw if any of the given paths is not absolute', function () {
      expect(() => util.isSubPath('some/..', '/root')).to.throw(/absolute/);
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
      expect(
        await util.isSameDestination(
          path1,
          path.resolve(tmpDir, '..', path.basename(tmpDir), path.basename(path1))
        )
      ).to.be.true;
    });
    it('should not match paths if they point to non existing items', async function () {
      expect(await util.isSameDestination(path1, 'blabla')).to.be.false;
    });
    it('should not match paths to different files', async function () {
      expect(await util.isSameDestination(path1, path2)).to.be.false;
    });
  });

  describe('compareVersions', function () {
    it('should compare two correct version numbers', function () {
      expect(util.compareVersions('10.0', '<', '11.0')).to.eql(true);
      expect(util.compareVersions('11.0', '>=', '11.0')).to.eql(true);
      expect(util.compareVersions('11.0', '==', '11.0')).to.eql(true);
      expect(util.compareVersions('13.10', '>', '13.5')).to.eql(true);
      expect(util.compareVersions('11.1', '!=', '11.10')).to.eql(true);
      expect(util.compareVersions('12.0', '<', 10 as any)).to.eql(false);
    });
    it('should throw if any of version arguments is invalid', function () {
      expect(() => util.compareVersions(undefined as any, '<', '11.0')).to.throw();
      expect(() => util.compareVersions('11.0', '==', null as any)).to.throw();
    });
    it('should throw if comparison operator is unsupported', function () {
      expect(() => util.compareVersions('12.0', 'abc', 10 as any)).to.throw();
    });
  });

  describe('quote', function () {
    it('should quote a string with a space', function () {
      expect(util.quote(['a', 'b', 'c d'])).to.eql("a b 'c d'");
    });
    it('should escape double quotes', function () {
      expect(util.quote(['a', 'b', `it's a "neat thing"`])).to.eql(
        `a b "it's a \\"neat thing\\""`
      );
    });
    it("should escape $ ` and '", function () {
      expect(util.quote(['$', '`', `'`])).to.eql('\\$ \\` "\'"');
    });
    it('should handle empty array', function () {
      expect(util.quote([])).to.eql('');
    });
    it('should quote a string with newline', function () {
      expect(util.quote(['a\nb'])).to.eql(`'a\nb'`);
    });
    it('should stringify booleans', function () {
      expect(util.quote(['a', 1, true, false] as any)).to.eql('a 1 true false');
    });
    it('should stringify null and undefined', function () {
      expect(util.quote(['a', 1, null, undefined] as any)).to.eql('a 1 null undefined');
    });
  });

  describe('pluralize', function () {
    it('should pluralize a string', function () {
      expect(util.pluralize('word', 2)).to.eql('words');
    });
    it('should pluralize a string and prepend the number through boolean', function () {
      expect(util.pluralize('word', 2, true)).to.eql('2 words');
    });
    it('should pluralize a string and prepend the number through options', function () {
      expect(util.pluralize('word', 2, {inclusive: true})).to.eql('2 words');
    });
  });

  describe('memoize', function () {
    it('should memoize using first argument by default', function () {
      let callCount = 0;
      const fn = util.memoize((value: number) => {
        callCount += 1;
        return value * 2;
      });
      expect(fn(2)).to.equal(4);
      expect(fn(2)).to.equal(4);
      expect(callCount).to.equal(1);
    });

    it('should memoize by first argument only', function () {
      let callCount = 0;
      const fn = util.memoize((a: number, b: number) => {
        callCount += 1;
        return a + b;
      });
      expect(fn(1, 2)).to.equal(3);
      expect(fn(1, 999)).to.equal(3);
      expect(callCount).to.equal(1);
    });
  });

  describe('isPlainObject', function () {
    it('should return true for plain objects', function () {
      expect(util.isPlainObject({})).to.be.true;
      expect(util.isPlainObject(Object.create(null))).to.be.true;
    });

    it('should return false for non-plain objects', function () {
      expect(util.isPlainObject([])).to.be.false;
      expect(util.isPlainObject(new Date())).to.be.false;
      expect(util.isPlainObject(null)).to.be.false;
    });

    it('should match lodash behavior for edge cases', function () {
      const spoofed = {a: 1, [Symbol.toStringTag]: 'Custom'};
      expect(util.isPlainObject(spoofed)).to.be.true;

      function CustomCtor(this: any) {
        this.a = 1;
      }
      const withCustomCtorOnProto = Object.create({constructor: CustomCtor});
      expect(util.isPlainObject(withCustomCtorOnProto)).to.be.false;
    });
  });

  describe('isEmpty', function () {
    it('should handle strings and arrays', function () {
      expect(util.isEmpty('')).to.be.true;
      expect(util.isEmpty('x')).to.be.false;
      expect(util.isEmpty([])).to.be.true;
      expect(util.isEmpty([1])).to.be.false;
    });

    it('should handle objects and collections', function () {
      expect(util.isEmpty({})).to.be.true;
      expect(util.isEmpty({a: 1})).to.be.false;
      expect(util.isEmpty(new Map())).to.be.true;
      expect(util.isEmpty(new Set([1]))).to.be.false;
    });
  });

  describe('isEqual', function () {
    it('should deeply compare nested objects', function () {
      expect(util.isEqual({a: [1, {b: 'c'}]}, {a: [1, {b: 'c'}]})).to.be.true;
      expect(util.isEqual({a: [1, {b: 'c'}]}, {a: [1, {b: 'd'}]})).to.be.false;
    });

    it('should compare special values and typed objects', function () {
      expect(util.isEqual(NaN, NaN)).to.be.true;
      expect(util.isEqual(new Date('2020-01-01'), new Date('2020-01-01'))).to.be.true;
      expect(util.isEqual(/abc/gi, /abc/gi)).to.be.true;
      expect(util.isEqual(Buffer.from('a'), Buffer.from('a'))).to.be.true;
    });

    it('should compare maps and sets', function () {
      const entries: Array<[string, number | {c: number}]> = [
        ['a', 1],
        ['b', {c: 2}],
      ];
      expect(util.isEqual(new Map(entries), new Map(entries))).to.be.true;
      expect(util.isEqual(new Set([1, 2]), new Set([2, 1]))).to.be.true;
      expect(util.isEqual(new Set([1, 2]), new Set([2, 3]))).to.be.false;
    });

    it('should compare functions by identity only', function () {
      const fn1 = () => 1;
      const fn2 = () => 1;
      (fn1 as any).x = 1;
      (fn2 as any).x = 1;
      expect(util.isEqual(fn1, fn1)).to.be.true;
      expect(util.isEqual(fn1, fn2)).to.be.false;
    });

    it('should ignore non-enumerable own properties', function () {
      const left: Record<string, unknown> = {a: 1};
      const right: Record<string, unknown> = {a: 1};
      Object.defineProperty(left, 'hidden', {value: 1, enumerable: false});
      Object.defineProperty(right, 'hidden', {value: 2, enumerable: false});
      expect(util.isEqual(left, right)).to.be.true;
    });

    it('should compare errors and boxed symbols like lodash', function () {
      expect(util.isEqual(new Error('boom'), new Error('boom'))).to.be.true;
      expect(util.isEqual(new Error('boom'), new Error('kaboom'))).to.be.false;
      expect(util.isEqual(Object(Symbol.for('x')), Object(Symbol.for('x')))).to.be.true;
      expect(util.isEqual(Object(Symbol.for('x')), Object(Symbol.for('y')))).to.be.false;
    });
  });

  describe('escapeRegExp', function () {
    it('should escape regexp metacharacters', function () {
      expect(util.escapeRegExp('a+b*c?.(x)[y]{z}|^$\\')).to.equal(
        'a\\+b\\*c\\?\\.\\(x\\)\\[y\\]\\{z\\}\\|\\^\\$\\\\'
      );
    });
  });

  describe('uniq', function () {
    it('should return a duplicate-free array preserving order', function () {
      expect(util.uniq([1, 2, 1, 3, 2])).to.eql([1, 2, 3]);
    });
  });

  describe('truncateString', function () {
    it('should not change short strings', function () {
      expect(util.truncateString('short')).to.equal('short');
    });

    it('should truncate with default options', function () {
      const src = 'abcdefghijklmnopqrstuvwxyz0123456789';
      expect(util.truncateString(src)).to.equal('abcdefghijklmnopqrstuvwxyz012…');
    });

    it('should support numeric length shorthand', function () {
      expect(util.truncateString('abcdefghijklmnopqrstuvwxyz', 10)).to.equal('abcdefghi…');
    });

    it('should support custom omission', function () {
      expect(util.truncateString('abcdefghijklmnopqrstuvwxyz', {length: 10, omission: '..'})).to.equal(
        'abcdefgh..'
      );
    });

    it('should handle non-string values safely', function () {
      expect(() => util.truncateString(undefined as any)).not.to.throw();
      expect(() => util.truncateString(null as any)).not.to.throw();
      expect(util.truncateString(undefined as any)).to.equal('');
      expect(util.truncateString(null as any)).to.equal('');
      expect(util.truncateString(123456 as any, 5)).to.equal('1234…');
      expect(util.truncateString({a: 1} as any, 8)).to.equal('[object…');
      expect(util.truncateString(-0 as any)).to.equal('-0');
    });

    it('should return omission if max length is too small', function () {
      expect(util.truncateString('hello world', 0)).to.equal('…');
    });
  });
});
