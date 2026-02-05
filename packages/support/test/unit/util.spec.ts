import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {util, fs, tempDir} from '../../lib';
import B from 'bluebird';
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
      await util.cancellableDelay('10');
    });
    it('cancel should work', async function () {
      const delay = util.cancellableDelay('1000');
      await B.delay(10);
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
});
