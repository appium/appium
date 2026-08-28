import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it} from 'node:test';

import {node} from '../../lib/index.js';

describe('node utilities', function () {
  describe('getObjectSize', function () {
    it('should be able to calculate size of different object types', function () {
      assert.strictEqual(node.getObjectSize(1), 8);
      assert.strictEqual(node.getObjectSize(true), 4);
      assert.strictEqual(node.getObjectSize('yolo'), 8);
      assert.strictEqual(node.getObjectSize(null), 0);
      assert.strictEqual(node.getObjectSize({}), 0);
      assert.strictEqual(node.getObjectSize(Buffer.from([1, 2, 3])), 3);
      assert.strictEqual(
        node.getObjectSize({
          a: 1,
          b: 2,
          c: {
            d: 4,
          },
        }),
        32,
      );
    });
  });

  describe('getModuleRootSync', function () {
    it("should be able to find current module's root", function () {
      assert.ok(path.resolve(import.meta.dirname).includes(node.getModuleRootSync('@appium/support', import.meta.filename)!));
    });

    it('should return null if no root is found', function () {
      assert.strictEqual(node.getModuleRootSync('yolo', import.meta.filename), null);
    });
  });

  describe('getObjectId', function () {
    it('should be able to calculate object identifiers', function () {
      const obj1 = {};
      const obj2 = {};
      assert.notStrictEqual(node.getObjectId({}), node.getObjectId(obj1));
      assert.notStrictEqual(node.getObjectId({}), node.getObjectId(obj2));
      assert.notStrictEqual(node.getObjectId(obj1), node.getObjectId(obj2));
      assert.strictEqual(node.getObjectId(obj1), node.getObjectId(obj1));
      assert.strictEqual(node.getObjectId(obj2), node.getObjectId(obj2));
    });
  });

  describe('deepFreeze', function () {
    it('should be able to deep freeze objects', function () {
      const obj1 = {};
      assert.deepStrictEqual(node.deepFreeze(obj1), obj1);
      const obj2 = node.deepFreeze({a: {b: 'c'}});
      assert.throws(() => ((obj2 as any).a.b = 'd'));
      assert.strictEqual(node.deepFreeze(1), 1);
      assert.strictEqual(node.deepFreeze(null), null);
      const obj3 = [1, {}, 3];
      assert.strictEqual(node.deepFreeze(obj3), obj3);
    });
  });
});
