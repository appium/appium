import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {mergePlainObjects, omit, omitKeys, pick, pickBy} from '../../lib/utils.js';

describe('utils', function () {
  describe('mergePlainObjects', function () {
    it('should deep-merge plain objects without mutating the target', function () {
      const target: Record<string, unknown> = {a: 1, nested: {x: 1, y: 2}};
      const result = mergePlainObjects(target, {b: 2, nested: {y: 3, z: 4}}, undefined);

      assert.deepStrictEqual(result, {a: 1, b: 2, nested: {x: 1, y: 3, z: 4}});
      assert.deepStrictEqual(target, {a: 1, nested: {x: 1, y: 2}});
    });

    it('should skip null and undefined sources', function () {
      const target: Record<string, unknown> = {a: 1};
      assert.deepStrictEqual(mergePlainObjects(target, undefined, {b: 2}), {a: 1, b: 2});
      assert.deepStrictEqual(mergePlainObjects(target, null as any, {b: 2}), {a: 1, b: 2});
    });

    it('should replace nested values when the source value is not a plain object', function () {
      const target: Record<string, unknown> = {nested: {a: 1}};
      assert.deepStrictEqual(mergePlainObjects(target, {nested: 'replaced'}), {
        nested: 'replaced',
      });
    });
  });

  describe('omit', function () {
    it('should omit a key from a plain object', function () {
      assert.deepStrictEqual(omit({a: 1, b: 2}, 'a'), {b: 2});
    });

    it('should return non-plain objects unchanged', function () {
      assert.strictEqual(omit(null as any, 'a'), null);
      assert.strictEqual(omit('text' as any, 'a'), 'text');
    });
  });

  describe('omitKeys', function () {
    it('should omit multiple keys', function () {
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

  describe('pick', function () {
    it('should pick only the listed keys', function () {
      assert.deepStrictEqual(pick({a: 1, b: 2, c: 3}, ['a', 'c']), {a: 1, c: 3});
    });
  });

  describe('pickBy', function () {
    it('should keep entries that pass the predicate', function () {
      assert.deepStrictEqual(
        pickBy({a: 1, b: '', c: 3}, (value) => value !== ''),
        {a: 1, c: 3},
      );
    });
  });
});
