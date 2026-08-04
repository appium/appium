import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

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
      assert.strictEqual(kebabCase('fooBar'), 'foo-bar');
      assert.strictEqual(kebabCase('foo_bar'), 'foo-bar');
      assert.strictEqual(kebabCase('Foo Bar'), 'foo-bar');
    });

    it('should split acronym boundaries like lodash', function () {
      assert.strictEqual(kebabCase('someXMLParser'), 'some-xml-parser');
      assert.strictEqual(kebabCase('getHTTPResponse'), 'get-http-response');
      assert.strictEqual(kebabCase('XMLHttpRequest'), 'xml-http-request');
    });
  });

  describe('camelCase()', function () {
    it('should convert kebab-case and snake_case to camelCase', function () {
      assert.strictEqual(camelCase('foo-bar'), 'fooBar');
      assert.strictEqual(camelCase('foo_bar'), 'fooBar');
      assert.strictEqual(camelCase('Foo Bar'), 'fooBar');
    });

    it('should return an empty string for whitespace-only input', function () {
      assert.strictEqual(camelCase('   '), '');
    });
  });

  describe('capitalize()', function () {
    it('should uppercase the first character', function () {
      assert.strictEqual(capitalize('hello'), 'Hello');
    });

    it('should return an empty string unchanged', function () {
      assert.strictEqual(capitalize(''), '');
    });
  });

  describe('omitKeys()', function () {
    it('should omit multiple keys from a plain object', function () {
      assert.deepStrictEqual(omitKeys({a: 1, b: 2, c: 3}, ['a', 'c']), {b: 2});
    });

    it('should return the same object when keys is empty', function () {
      const obj = {a: 1};
      assert.strictEqual(omitKeys(obj, []), obj);
    });

    it('should return non-plain objects unchanged', function () {
      assert.strictEqual(omitKeys(null as any, ['a']), null);
    });
  });

  describe('pickBy()', function () {
    it('should keep entries that pass the predicate', function () {
      assert.deepStrictEqual(pickBy({a: 1, b: '', c: 3}, (value) => value !== ''), {a: 1, c: 3});
    });

    it('should pass key to the predicate', function () {
      assert.deepStrictEqual(pickBy({a: 1, b: 2}, (_value, key) => key === 'a'), {a: 1});
    });
  });

  describe('mapValues()', function () {
    it('should transform values while preserving keys', function () {
      assert.deepStrictEqual(mapValues({a: 1, b: 2}, (v) => v * 2), {a: 2, b: 4});
    });
  });

  describe('mapKeys()', function () {
    it('should rename keys while preserving values', function () {
      assert.deepStrictEqual(mapKeys({a: 1}, (_v, key) => `${key}Key`), {aKey: 1});
    });
  });

  describe('getPath()', function () {
    it('should read nested dot-separated paths', function () {
      assert.strictEqual(getPath({a: {b: {c: 3}}}, 'a.b.c'), 3);
    });

    it('should return defaultValue when a segment is missing', function () {
      assert.strictEqual(getPath({a: 1}, 'a.b.c', 'default'), 'default');
      assert.strictEqual(getPath(null, 'a', 'default'), 'default');
    });

    it('should return defaultValue when the resolved value is undefined', function () {
      assert.strictEqual(getPath({a: undefined}, 'a', 'default'), 'default');
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
      assert.strictEqual(getPath(schema, 'properties.server.properties.log.appiumCliDest'), 'logFile');
      assert.strictEqual(getPath(schema, 'properties.server.properties.allow-cors.appiumCliDest'), 'allowCors');
    });
  });

  describe('setPath()', function () {
    it('should assign nested values and create plain object segments', function () {
      const obj: Record<string, unknown> = {};
      setPath(obj, 'a.b.c', 3);
      assert.deepStrictEqual(obj, {a: {b: {c: 3}}});
    });

    it('should replace non-plain intermediate values with plain objects', function () {
      const obj: Record<string, unknown> = {a: {b: null}};
      setPath(obj, 'a.b.c', 1);
      assert.deepStrictEqual(obj, {a: {b: {c: 1}}});
    });

    it('should no-op on unsafe path segments', function () {
      const obj: Record<string, unknown> = {};
      const sentinel = 'polluted';
      for (const path of ['__proto__.x', 'a.__proto__.x', 'constructor.x', 'prototype.x']) {
        setPath(obj, path, sentinel);
      }
      assert.deepStrictEqual(obj, {});
      assert.strictEqual(({} as Record<string, unknown>)[sentinel], undefined);
    });

    it('should no-op on paths with empty segments', function () {
      const obj: Record<string, unknown> = {};
      setPath(obj, 'a..b', 1);
      assert.deepStrictEqual(obj, {});
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
      assert.strictEqual(unbound.call({value: 99}), 99);

      bindAll(target, ['getValue']);

      const extracted = target.getValue;
      assert.strictEqual(extracted(), 1);
      assert.strictEqual(extracted.call({value: 99}), 1);
      assert.strictEqual(target.getValue(), 1);
    });

    it('should ignore non-function properties', function () {
      const target = {a: 1};
      assert.strictEqual(bindAll(target, ['a']), target);
    });
  });

  describe('compact()', function () {
    it('should remove falsy entries', function () {
      assert.deepStrictEqual(compact([0, 1, '', 'x', false, null, undefined]), [1, 'x']);
    });
  });

  describe('pull()', function () {
    it('should remove all occurrences of the given values', function () {
      const arr = [1, 2, 1, 3, 1];
      assert.strictEqual(pull(arr, 1), arr);
      assert.deepStrictEqual(arr, [2, 3]);
    });
  });

  describe('zip()', function () {
    it('should pair elements by index', function () {
      assert.deepStrictEqual(zip([1, 2], ['a', 'b']), [
        [1, 'a'],
        [2, 'b'],
      ]);
    });

    it('should use undefined when the second array is shorter', function () {
      assert.deepStrictEqual(zip([1, 2], ['a']), [
        [1, 'a'],
        [2, undefined],
      ]);
    });
  });

  describe('difference()', function () {
    it('should return elements in the first array not present in the second', function () {
      assert.deepStrictEqual(difference([1, 2, 3, 2], [2, 4]), [1, 3]);
    });
  });

  describe('defaultsDeep()', function () {
    it('should fill only undefined properties recursively for plain objects', function () {
      const result = defaultsDeep(
        {a: 1, nested: {x: 1}} as Record<string, unknown>,
        {b: 2, nested: {y: 2, z: 3}} as Record<string, unknown>,
      );
      assert.deepStrictEqual(result, {a: 1, b: 2, nested: {x: 1, y: 2, z: 3}});
    });

    it('should not overwrite defined nested values with defaults', function () {
      const result = defaultsDeep(
        {nested: {x: 1, y: 2}} as Record<string, unknown>,
        {nested: {x: 9, z: 3}} as Record<string, unknown>,
      );
      assert.deepStrictEqual(result, {nested: {x: 1, y: 2, z: 3}});
    });

    it('should skip null and undefined sources', function () {
      assert.deepStrictEqual(defaultsDeep({a: 1} as Record<string, unknown>, undefined, {b: 2} as Record<string, unknown>), {
        a: 1,
        b: 2,
      });
      assert.deepStrictEqual(
        defaultsDeep(
          {a: 1} as Record<string, unknown>,
          null as unknown as Record<string, unknown>,
          {b: 2} as Record<string, unknown>,
        ),
        {a: 1, b: 2},
      );
    });

    it('should merge multiple sources in order', function () {
      assert.deepStrictEqual(
        defaultsDeep(
          {} as Record<string, unknown>,
          {a: 1} as Record<string, unknown>,
          {b: 2} as Record<string, unknown>,
        ),
        {a: 1, b: 2},
      );
    });

    it('should not mutate source objects', function () {
      const source = {nested: {y: 2}} as Record<string, unknown>;
      defaultsDeep({nested: {x: 1}} as Record<string, unknown>, source);
      assert.deepStrictEqual(source, {nested: {y: 2}});
    });

    it('should copy functions by reference when filling undefined keys', function () {
      const logHandler = () => {};
      const result = defaultsDeep({} as Record<string, unknown>, {logHandler} as Record<string, unknown>);
      assert.strictEqual(result.logHandler, logHandler);
    });

    it('should merge later sources when earlier sources include functions', function () {
      const logHandler = () => {};
      const result = defaultsDeep(
        {} as Record<string, unknown>,
        {logHandler} as Record<string, unknown>,
        {port: 4723} as Record<string, unknown>,
      );
      assert.strictEqual(result.logHandler, logHandler);
      assert.strictEqual(result.port, 4723);
    });
  });
});
