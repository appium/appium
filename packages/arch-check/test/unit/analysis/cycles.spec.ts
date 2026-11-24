import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {classifyCycles, cycleKey, isRuntimeCycle} from '../../../lib/analysis/cycles.js';
import type {SourceGraph} from '../../../lib/analysis/graph.js';
import {mod} from './modules.js';

describe('cycles', () => {
  it('canonicalizes cycles regardless of rotation', () => {
    assert.equal(cycleKey(['b', 'c', 'a']), cycleKey(['a', 'b', 'c']));
    assert.notEqual(cycleKey(['a', 'b']), cycleKey(['a', 'b', 'c']));
  });

  it('tells runtime cycles from cycles that use a type-only import', () => {
    const runtimeEdges = new Set(['a -> b', 'b -> a', 'b -> c']);
    assert.ok(isRuntimeCycle(['a', 'b'], runtimeEdges));
    assert.ok(!isRuntimeCycle(['a', 'b', 'c'], runtimeEdges));
  });

  describe('classifyCycles', () => {
    const runtime: SourceGraph = {
      modules: [mod('a', [{module: './b', resolved: 'b'}]), mod('b', [{module: './a', resolved: 'a'}])],
      cycles: ['a > b'],
    };
    const withTypes: SourceGraph = {
      modules: [],
      // `a > b` is the runtime cycle again; `c > d` needs a type-only import
      cycles: ['c > d', 'a > b'],
    };

    it('keeps runtime cycles and drops them from the type-only list', () => {
      assert.deepEqual(classifyCycles(withTypes, runtime, 'error'), {
        runtimeCycles: ['a > b'],
        typeOnlyCycles: ['c > d'],
      });
    });

    it('leaves the type-only list empty when they are ignored', () => {
      assert.deepEqual(classifyCycles(withTypes, runtime, 'ignore'), {runtimeCycles: ['a > b'], typeOnlyCycles: []});
    });
  });
});
