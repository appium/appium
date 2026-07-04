import {describe, it} from 'node:test';

import {expect} from 'chai';

import {
  bindAll,
  camelCase,
  capitalize,
  compact,
  defaultsDeep,
  difference,
  getPath,
  kebabCase,
  mapKeys,
  mapValues,
  omitKeys,
  pickBy,
  pull,
  setPath,
  zip,
} from '../../../lib/utils/object';

describe('utils/object', function () {
  describe('kebabCase()', function () {
    it('should convert camelCase and snake_case to kebab-case', function () {
      expect(kebabCase('fooBar')).to.equal('foo-bar');
      expect(kebabCase('foo_bar')).to.equal('foo-bar');
      expect(kebabCase('Foo Bar')).to.equal('foo-bar');
    });

    it('should split acronym boundaries like lodash', function () {
      expect(kebabCase('someXMLParser')).to.equal('some-xml-parser');
      expect(kebabCase('getHTTPResponse')).to.equal('get-http-response');
      expect(kebabCase('XMLHttpRequest')).to.equal('xml-http-request');
    });
  });

  describe('camelCase()', function () {
    it('should convert kebab-case and snake_case to camelCase', function () {
      expect(camelCase('foo-bar')).to.equal('fooBar');
      expect(camelCase('foo_bar')).to.equal('fooBar');
      expect(camelCase('Foo Bar')).to.equal('fooBar');
    });

    it('should return an empty string for whitespace-only input', function () {
      expect(camelCase('   ')).to.equal('');
    });
  });

  describe('capitalize()', function () {
    it('should uppercase the first character', function () {
      expect(capitalize('hello')).to.equal('Hello');
    });

    it('should return an empty string unchanged', function () {
      expect(capitalize('')).to.equal('');
    });
  });

  describe('omitKeys()', function () {
    it('should omit multiple keys from a plain object', function () {
      expect(omitKeys({a: 1, b: 2, c: 3}, ['a', 'c'])).to.eql({b: 2});
    });

    it('should return the same object when keys is empty', function () {
      const obj = {a: 1};
      expect(omitKeys(obj, [])).to.equal(obj);
    });

    it('should return non-plain objects unchanged', function () {
      expect(omitKeys(null as any, ['a'])).to.equal(null);
    });
  });

  describe('pickBy()', function () {
    it('should keep entries that pass the predicate', function () {
      expect(pickBy({a: 1, b: '', c: 3}, (value) => value !== '')).to.eql({a: 1, c: 3});
    });

    it('should pass key to the predicate', function () {
      expect(pickBy({a: 1, b: 2}, (_value, key) => key === 'a')).to.eql({a: 1});
    });
  });

  describe('mapValues()', function () {
    it('should transform values while preserving keys', function () {
      expect(mapValues({a: 1, b: 2}, (v) => v * 2)).to.eql({a: 2, b: 4});
    });
  });

  describe('mapKeys()', function () {
    it('should rename keys while preserving values', function () {
      expect(mapKeys({a: 1}, (_v, key) => `${key}Key`)).to.eql({aKey: 1});
    });
  });

  describe('getPath()', function () {
    it('should read nested dot-separated paths', function () {
      expect(getPath({a: {b: {c: 3}}}, 'a.b.c')).to.equal(3);
    });

    it('should return defaultValue when a segment is missing', function () {
      expect(getPath({a: 1}, 'a.b.c', 'default')).to.equal('default');
      expect(getPath(null, 'a', 'default')).to.equal('default');
    });

    it('should return defaultValue when the resolved value is undefined', function () {
      expect(getPath({a: undefined}, 'a', 'default')).to.equal('default');
    });

    it('should read paths with hyphenated property segments', function () {
      const schema = {
        properties: {
          server: {
            properties: {
              'allow-cors': {appiumCliDest: 'allowCors'},
              log: {appiumCliDest: 'logFile'},
            },
          },
        },
      };
      expect(getPath(schema, 'properties.server.properties.log.appiumCliDest')).to.equal('logFile');
      expect(getPath(schema, 'properties.server.properties.allow-cors.appiumCliDest')).to.equal('allowCors');
    });
  });

  describe('setPath()', function () {
    it('should assign nested values and create plain object segments', function () {
      const obj: Record<string, unknown> = {};
      setPath(obj, 'a.b.c', 3);
      expect(obj).to.eql({a: {b: {c: 3}}});
    });

    it('should replace non-plain intermediate values with plain objects', function () {
      const obj: Record<string, unknown> = {a: {b: null}};
      setPath(obj, 'a.b.c', 1);
      expect(obj).to.eql({a: {b: {c: 1}}});
    });

    it('should no-op on unsafe path segments', function () {
      const obj: Record<string, unknown> = {};
      const sentinel = 'polluted';
      for (const path of ['__proto__.x', 'a.__proto__.x', 'constructor.x', 'prototype.x']) {
        setPath(obj, path, sentinel);
      }
      expect(obj).to.eql({});
      expect(({} as Record<string, unknown>)[sentinel]).to.be.undefined;
    });

    it('should no-op on paths with empty segments', function () {
      const obj: Record<string, unknown> = {};
      setPath(obj, 'a..b', 1);
      expect(obj).to.eql({});
    });
  });

  describe('bindAll()', function () {
    it('should bind listed methods so they keep the correct this', function () {
      const target = {
        value: 1,
        getValue() {
          return this.value;
        },
      };
      const unbound = target.getValue;
      expect(unbound.call({value: 99})).to.equal(99);

      bindAll(target, ['getValue']);

      const extracted = target.getValue;
      expect(extracted()).to.equal(1);
      expect(extracted.call({value: 99})).to.equal(1);
      expect(target.getValue()).to.equal(1);
    });

    it('should ignore non-function properties', function () {
      const target = {a: 1};
      expect(bindAll(target, ['a'])).to.equal(target);
    });
  });

  describe('compact()', function () {
    it('should remove falsy entries', function () {
      expect(compact([0, 1, '', 'x', false, null, undefined])).to.eql([1, 'x']);
    });
  });

  describe('pull()', function () {
    it('should remove all occurrences of the given values', function () {
      const arr = [1, 2, 1, 3, 1];
      expect(pull(arr, 1)).to.equal(arr);
      expect(arr).to.eql([2, 3]);
    });
  });

  describe('zip()', function () {
    it('should pair elements by index', function () {
      expect(zip([1, 2], ['a', 'b'])).to.eql([
        [1, 'a'],
        [2, 'b'],
      ]);
    });

    it('should use undefined when the second array is shorter', function () {
      expect(zip([1, 2], ['a'])).to.eql([
        [1, 'a'],
        [2, undefined],
      ]);
    });
  });

  describe('difference()', function () {
    it('should return elements in the first array not present in the second', function () {
      expect(difference([1, 2, 3, 2], [2, 4])).to.eql([1, 3]);
    });
  });

  describe('defaultsDeep()', function () {
    it('should fill only undefined properties recursively for plain objects', function () {
      const result = defaultsDeep(
        {a: 1, nested: {x: 1}} as Record<string, unknown>,
        {b: 2, nested: {y: 2, z: 3}} as Record<string, unknown>,
      );
      expect(result).to.eql({a: 1, b: 2, nested: {x: 1, y: 2, z: 3}});
    });

    it('should not overwrite defined nested values with defaults', function () {
      const result = defaultsDeep(
        {nested: {x: 1, y: 2}} as Record<string, unknown>,
        {nested: {x: 9, z: 3}} as Record<string, unknown>,
      );
      expect(result).to.eql({nested: {x: 1, y: 2, z: 3}});
    });

    it('should skip null and undefined sources', function () {
      expect(defaultsDeep({a: 1} as Record<string, unknown>, undefined, {b: 2} as Record<string, unknown>)).to.eql({
        a: 1,
        b: 2,
      });
      expect(
        defaultsDeep(
          {a: 1} as Record<string, unknown>,
          null as unknown as Record<string, unknown>,
          {b: 2} as Record<string, unknown>,
        ),
      ).to.eql({a: 1, b: 2});
    });

    it('should merge multiple sources in order', function () {
      expect(
        defaultsDeep(
          {} as Record<string, unknown>,
          {a: 1} as Record<string, unknown>,
          {b: 2} as Record<string, unknown>,
        ),
      ).to.eql({a: 1, b: 2});
    });

    it('should not mutate source objects', function () {
      const source = {nested: {y: 2}} as Record<string, unknown>;
      defaultsDeep({nested: {x: 1}} as Record<string, unknown>, source);
      expect(source).to.eql({nested: {y: 2}});
    });

    it('should copy functions by reference when filling undefined keys', function () {
      const logHandler = () => {};
      const result = defaultsDeep({} as Record<string, unknown>, {logHandler} as Record<string, unknown>);
      expect(result.logHandler).to.equal(logHandler);
    });

    it('should merge later sources when earlier sources include functions', function () {
      const logHandler = () => {};
      const result = defaultsDeep(
        {} as Record<string, unknown>,
        {logHandler} as Record<string, unknown>,
        {port: 4723} as Record<string, unknown>,
      );
      expect(result.logHandler).to.equal(logHandler);
      expect(result.port).to.equal(4723);
    });
  });
});
