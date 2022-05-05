import {util, fs, tempDir} from '../../lib';
import B from 'bluebird';
import {createSandbox} from 'sinon';
import os from 'os';
import path from 'path';
import _ from 'lodash';

const {W3C_WEB_ELEMENT_IDENTIFIER} = util;

describe('util', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('hasValue', function () {
    it('should exist', function () {
      should.exist(util.hasValue);
    });

    it('should handle undefined', function () {
      util.hasValue(undefined).should.be.false;
    });

    it('should handle not a number', function () {
      util.hasValue(NaN).should.be.false;
    });

    it('should handle null', function () {
      util.hasValue(null).should.be.false;
    });

    it('should handle functions', function () {
      util.hasValue(function () {}).should.be.true;
    });

    it('should handle empty arrays', function () {
      util.hasValue({}).should.be.true;
    });

    it('should handle zero', function () {
      util.hasValue(0).should.be.true;
    });

    it('should handle simple string', function () {
      util.hasValue('string').should.be.true;
    });

    it('should handle booleans', function () {
      util.hasValue(false).should.be.true;
    });

    it('should handle empty strings', function () {
      util.hasValue('').should.be.true;
    });
  });

  describe('hasContent', function () {
    it('should exist', function () {
      should.exist(util.hasContent);
    });

    it('should handle undefined', function () {
      util.hasContent(undefined).should.be.false;
    });

    it('should handle not a number', function () {
      util.hasContent(NaN).should.be.false;
    });

    it('should handle null', function () {
      util.hasContent(null).should.be.false;
    });

    it('should handle functions', function () {
      util.hasContent(function () {}).should.be.false;
    });

    it('should handle empty arrays', function () {
      util.hasContent({}).should.be.false;
    });

    it('should handle zero', function () {
      util.hasContent(0).should.be.false;
    });

    it('should handle simple string', function () {
      util.hasContent('string').should.be.true;
    });

    it('should handle booleans', function () {
      util.hasContent(false).should.be.false;
    });

    it('should handle empty strings', function () {
      util.hasContent('').should.be.false;
    });
  });

  describe('escapeSpace', function () {
    it('should do nothing to a string without space', function () {
      let actual = 'appium';
      let expected = 'appium';
      util.escapeSpace(actual).should.equal(expected);
    });

    it('should do escape spaces', function () {
      let actual = '/Applications/ Xcode 6.1.1.app/Contents/Developer';
      let expected = '/Applications/\\ Xcode\\ 6.1.1.app/Contents/Developer';
      util.escapeSpace(actual).should.equal(expected);
    });

    it('should escape consecutive spaces', function () {
      let actual = 'appium   space';
      let expected = 'appium\\ \\ \\ space';
      util.escapeSpace(actual).should.equal(expected);
    });
  });

  describe('localIp', function () {
    it('should find a local ip address', function () {
      let ifConfigOut = {
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
      let osMock = sandbox.mock(os);
      osMock.expects('networkInterfaces').returns(ifConfigOut);
      ifConfigOut = '';
      let ip = util.localIp();
      ip.should.eql('123.123.123.123');
      osMock.verify();
    });
  });

  describe('cancellableDelay', function () {
    it('should delay', async function () {
      await util.cancellableDelay('10');
    });
    it('cancel should work', async function () {
      let delay = util.cancellableDelay('1000');
      await B.delay(10);
      delay.cancel();
      await delay.should.eventually.be.rejectedWith(/cancellation error/);
    });
  });

  describe('safeJsonParse', function () {
    it('should pass object through', function () {
      const obj = {a: 'a', b: 'b'};
      util.safeJsonParse(obj).should.equal(obj);
    });
    it('should correctly parse json string', function () {
      const obj = {a: 'a', b: 'b'};
      util.safeJsonParse(JSON.stringify(obj)).should.eql(obj);
    });
    it('should pass an array through', function () {
      const arr = ['a', 'b'];
      util.safeJsonParse(arr).should.eql(arr);
    });
    it('should correctly parse json array', function () {
      const arr = ['a', 'b'];
      util.safeJsonParse(JSON.stringify(arr)).should.eql(arr);
    });
    it('should pass null through', function () {
      const obj = null;
      _.isNull(util.safeJsonParse(obj)).should.be.true;
    });
    it('should pass simple string through', function () {
      const str = 'str';
      util.safeJsonParse(str).should.eql(str);
    });
    it('should pass a number through', function () {
      const num = 42;
      util.safeJsonParse(num).should.eql(num);
    });
    it('should make a number from a string representation', function () {
      const num = 42;
      util.safeJsonParse(String(num)).should.eql(num);
    });
  });

  describe('jsonStringify', function () {
    it('should use JSON.stringify if no Buffer involved', function () {
      const obj = {
        k1: 'v1',
        k2: 'v2',
        k3: 'v3',
      };
      const jsonString = JSON.stringify(obj, null, 2);
      util.jsonStringify(obj).should.eql(jsonString);
    });
    it('should serialize a Buffer', function () {
      const obj = {
        k1: 'v1',
        k2: 'v2',
        k3: Buffer.from('hi how are you today'),
      };
      util.jsonStringify(obj).should.include('hi how are you today');
    });
    it('should use the replacer function on non-buffer values', function () {
      const obj = {
        k1: 'v1',
        k2: 'v2',
        k3: 'v3',
      };
      function replacer(key, value) {
        return _.isString(value) ? value.toUpperCase() : value;
      }
      const jsonString = util.jsonStringify(obj, replacer);
      jsonString.should.include('V1');
      jsonString.should.include('V2');
      jsonString.should.include('V3');
    });
    it('should use the replacer function on buffers', function () {
      const obj = {
        k1: 'v1',
        k2: 'v2',
        k3: Buffer.from('hi how are you today'),
      };
      function replacer(key, value) {
        return _.isString(value) ? value.toUpperCase() : value;
      }
      const jsonString = util.jsonStringify(obj, replacer);
      jsonString.should.include('V1');
      jsonString.should.include('V2');
      jsonString.should.include('HI HOW ARE YOU TODAY');
    });
    it('should use the replacer function recursively', function () {
      const obj = {
        k1: 'v1',
        k2: 'v2',
        k3: Buffer.from('hi how are you today'),
        k4: {
          k5: 'v5',
        },
      };
      function replacer(key, value) {
        return _.isString(value) ? value.toUpperCase() : value;
      }
      const jsonString = util.jsonStringify(obj, replacer);
      jsonString.should.include('V1');
      jsonString.should.include('V2');
      jsonString.should.include('HI HOW ARE YOU TODAY');
      jsonString.should.include('V5');
    });
  });

  describe('unwrapElement', function () {
    it('should pass through an unwrapped element', function () {
      let el = 4;
      util.unwrapElement(el).should.equal(el);
    });
    it('should pass through an element that is an object', function () {
      let el = {RANDOM: 4};
      util.unwrapElement(el).should.equal(el);
    });
    it('should unwrap a wrapped element', function () {
      let el = {ELEMENT: 4};
      util.unwrapElement(el).should.eql(4);
    });
    it('should unwrap a wrapped element that uses W3C element identifier', function () {
      let el = {
        [W3C_WEB_ELEMENT_IDENTIFIER]: 5,
      };
      util.unwrapElement(el).should.eql(5);
    });
    it('should unwrap a wrapped element and prioritize W3C element identifier', function () {
      let el = {
        ELEMENT: 7,
        [W3C_WEB_ELEMENT_IDENTIFIER]: 6,
      };
      util.unwrapElement(el).should.eql(6);
    });
  });

  describe('wrapElement', function () {
    it('should include ELEMENT and w3c element', function () {
      util.wrapElement(123).should.eql({
        [util.W3C_WEB_ELEMENT_IDENTIFIER]: 123,
        ELEMENT: 123,
      });
    });
  });

  describe('toReadableSizeString', function () {
    it('should fail if cannot convert to Bytes', function () {
      (() => util.toReadableSizeString('asdasd')).should.throw(
        /Cannot convert/
      );
    });
    it('should properly convert to Bytes', function () {
      util.toReadableSizeString(0).should.equal('0 B');
    });
    it('should properly convert to KBytes', function () {
      util.toReadableSizeString(2048 + 12).should.equal('2.01 KB');
    });
    it('should properly convert to MBytes', function () {
      util
        .toReadableSizeString(1024 * 1024 * 3 + 1024 * 10)
        .should.equal('3.01 MB');
    });
    it('should properly convert to GBytes', function () {
      util.toReadableSizeString(1024 * 1024 * 1024 * 5).should.equal('5.00 GB');
    });
  });

  describe('filterObject', function () {
    describe('with undefined predicate', function () {
      it('should filter out undefineds', function () {
        let obj = {
          a: 'a',
          b: 'b',
          c: undefined,
        };
        util.filterObject(obj).should.eql({
          a: 'a',
          b: 'b',
        });
      });
      it('should leave nulls alone', function () {
        let obj = {
          a: 'a',
          b: 'b',
          c: null,
        };
        util.filterObject(obj).should.eql({
          a: 'a',
          b: 'b',
          c: null,
        });
      });
    });
    describe('with value predicate', function () {
      it('should filter elements by their value', function () {
        let obj = {
          a: 'a',
          b: 'b',
          c: 'c',
          d: 'a',
        };
        util.filterObject(obj, 'a').should.eql({
          a: 'a',
          d: 'a',
        });
      });
    });
    describe('with function predicate', function () {
      it('should filter elements', function () {
        let obj = {
          a: 'a',
          b: 'b',
          c: 'c',
        };
        util
          .filterObject(obj, (v) => v === 'a' || v === 'c')
          .should.eql({
            a: 'a',
            c: 'c',
          });
      });
    });
  });

  describe('isSubPath', function () {
    it('should detect simple subpath', function () {
      util.isSubPath('/root/some', '/root').should.be.true;
    });
    it('should detect complex subpath', function () {
      util.isSubPath('/root/some/other/../../.', '/root').should.be.true;
    });
    it('should detect subpath ending with a slash', function () {
      util.isSubPath('/root/some/', '/root').should.be.true;
    });
    it('should detect if a path is not a subpath', function () {
      util.isSubPath('/root/some//../..', '/root').should.be.false;
    });
    it('should throw if any of the given paths is not absolute', function () {
      should.throw(() => util.isSubPath('some/..', '/root'), /absolute/);
    });
  });

  describe('isSameDestination', function () {
    let path1;
    let path2;
    let tmpDir;
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
      (
        await util.isSameDestination(
          path1,
          path.resolve(
            tmpDir,
            '..',
            path.basename(tmpDir),
            path.basename(path1)
          )
        )
      ).should.be.true;
    });
    it('should not match paths if they point to non existing items', async function () {
      (await util.isSameDestination(path1, 'blabla')).should.be.false;
    });
    it('should not match paths to different files', async function () {
      (await util.isSameDestination(path1, path2)).should.be.false;
    });
  });

  describe('compareVersions', function () {
    it('should compare two correct version numbers', function () {
      util.compareVersions('10.0', '<', '11.0').should.eql(true);
      util.compareVersions('11.0', '>=', '11.0').should.eql(true);
      util.compareVersions('11.0', '==', '11.0').should.eql(true);
      util.compareVersions('13.10', '>', '13.5').should.eql(true);
      util.compareVersions('11.1', '!=', '11.10').should.eql(true);
      util.compareVersions('12.0', '<', 10).should.eql(false);
    });
    it('should throw if any of version arguments is invalid', function () {
      should.throw(() => util.compareVersions(undefined, '<', '11.0'));
      should.throw(() => util.compareVersions('11.0', '==', null));
    });
    it('should throw if comparison operator is unsupported', function () {
      should.throw(() => util.compareVersions('12.0', 'abc', 10));
    });
  });

  describe('quote', function () {
    it('should quote a string with a space', function () {
      util.quote(['a', 'b', 'c d']).should.eql("a b 'c d'");
    });
    it('should escape double quotes', function () {
      util
        .quote(['a', 'b', `it's a "neat thing"`])
        .should.eql(`a b "it's a \\"neat thing\\""`);
    });
    it("should escape $ ` and '", function () {
      util.quote(['$', '`', `'`]).should.eql('\\$ \\` "\'"');
    });
    it('should handle empty array', function () {
      util.quote([]).should.eql('');
    });
    it('should quote a string with newline', function () {
      util.quote(['a\nb']).should.eql(`'a\nb'`);
    });
    it('should stringify booleans', function () {
      util.quote(['a', 1, true, false]).should.eql('a 1 true false');
    });
    it('should stringify null and undefined', function () {
      util.quote(['a', 1, null, undefined]).should.eql('a 1 null undefined');
    });
  });

  describe('unleakString', function () {
    it('should unleak a string', function () {
      util.unleakString('yolo').should.eql('yolo');
    });
    it('should unleak a multiline string', function () {
      util.unleakString(' yolo\nbolo ').should.eql(' yolo\nbolo ');
    });
    it('should convert an object to a string', function () {
      for (const obj of [{}, null, undefined, [], 0]) {
        util.unleakString(obj).should.eql(`${obj}`);
      }
    });
  });

  describe('pluralize', function () {
    /*
     * The pluralize library (https://github.com/blakeembrey/pluralize)
     * has a robust set of tests. Here we just need to verify that it
     * is usable through the exported package, and the arguments are correct
     */
    it('should pluralize a string', function () {
      util.pluralize('word', 2).should.eql('words');
    });
    it('should pluralize a string and prepend the number through boolean', function () {
      util.pluralize('word', 2, true).should.eql('2 words');
    });
    it('should pluralize a string and prepend the number through options', function () {
      util.pluralize('word', 2, {inclusive: true}).should.eql('2 words');
    });
  });
});
