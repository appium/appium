import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
  cycleKey,
  diffAgainstBaseline,
  externalPackageName,
  isRuntimeCycle,
  parseScopedSpecifier,
} from '../../lib/rules.js';

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
    assert.deepEqual(parseScopedSpecifier('@appium/support', ['@appium']), {pkg: '@appium/support'});
    assert.deepEqual(parseScopedSpecifier('@appium/support/lib/fs.js', ['@appium']), {
      pkg: '@appium/support',
      subpath: './lib/fs.js',
    });
    assert.equal(parseScopedSpecifier('@other/x', ['@appium']), null);
    assert.equal(parseScopedSpecifier('@appium/support', []), null);
  });

  it('names the package behind an import specifier', () => {
    assert.equal(externalPackageName('lodash'), 'lodash');
    assert.equal(externalPackageName('lodash/fp.js'), 'lodash');
    assert.equal(externalPackageName('@appium/support/lib/fs.js'), '@appium/support');
    for (const skipped of [
      './a.js',
      '../a.js',
      '/abs.js',
      '#internal',
      'node:fs',
      'fs',
      'fs/promises',
      'data:text/js,1',
    ]) {
      assert.equal(externalPackageName(skipped), null, skipped);
    }
  });
});
