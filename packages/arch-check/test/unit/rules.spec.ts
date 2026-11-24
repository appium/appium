import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {cycleKey, diffAgainstBaseline, isRuntimeCycle, parseScopedSpecifier} from '../../lib/rules.js';

describe('rules', () => {
  it('tells runtime cycles from cycles that use a type-only import', () => {
    const runtimeEdges = new Set(['a -> b', 'b -> a', 'b -> c']);
    assert.ok(isRuntimeCycle(['a', 'b'], runtimeEdges));
    assert.ok(!isRuntimeCycle(['a', 'b', 'c'], runtimeEdges));
  });

  it('canonicalizes cycles regardless of rotation', () => {
    assert.equal(cycleKey(['b', 'c', 'a']), cycleKey(['a', 'b', 'c']));
    assert.notEqual(cycleKey(['a', 'b']), cycleKey(['a', 'b', 'c']));
  });

  it('diffs against a baseline', () => {
    assert.deepEqual(diffAgainstBaseline(['a', 'b'], ['b', 'c']), {added: ['a'], stale: ['c']});
  });

  it('parses scoped specifiers', () => {
    assert.deepEqual(parseScopedSpecifier('@appium/support', ['@appium']), {pkg: '@appium/support', deep: false});
    assert.deepEqual(parseScopedSpecifier('@appium/support/lib/fs.js', ['@appium']), {
      pkg: '@appium/support',
      deep: true,
    });
    assert.equal(parseScopedSpecifier('@other/x', ['@appium']), null);
    assert.equal(parseScopedSpecifier('@appium/support', []), null);
  });
});
