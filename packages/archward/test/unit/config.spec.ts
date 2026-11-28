import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {normalizeSourceRoot, parseConfig} from '../../lib/config.js';

describe('parseConfig', () => {
  it('accepts valid options', () => {
    const config = {
      sourceRoot: 'src',
      tsconfig: 't.json',
      entryPointScopes: ['@a'],
      typeOnlyCycles: 'ignore',
      undeclaredDependencies: 'error',
      unusedEdges: 'error',
      unresolvedImports: 'warn',
    };
    assert.deepEqual(parseConfig(config, 'config.json'), config);
    assert.deepEqual(parseConfig({}, 'config.json'), {});
  });

  it('rejects unknown options and bad values', () => {
    assert.throws(() => parseConfig({sourceroot: 'src'}, 'config.json'), /unknown option 'sourceroot'/);
    assert.throws(() => parseConfig({sourceRoot: 1}, 'config.json'), /'sourceRoot' must be a string/);
    assert.throws(() => parseConfig({entryPointScopes: '@a'}, 'config.json'), /array of strings/);
    assert.throws(
      () => parseConfig({typeOnlyCycles: 'warn'}, 'config.json'),
      /'typeOnlyCycles' must be 'error' or 'ignore'/,
    );
    assert.throws(() => parseConfig({undeclaredDependencies: true}, 'config.json'), /'undeclaredDependencies' must be/);
    assert.throws(() => parseConfig({unusedEdges: 'ignore'}, 'config.json'), /'unusedEdges' must be 'warn' or 'error'/);
    assert.throws(() => parseConfig({unresolvedImports: true}, 'config.json'), /'unresolvedImports' must be/);
    assert.throws(() => parseConfig([], 'config.json'), /expected a JSON object/);
  });
});

describe('normalizeSourceRoot', () => {
  it('normalizes to a package-relative, slash-separated path', () => {
    for (const input of ['src', './src', 'src/', './src/', 'src\\\\', 'a/../src']) {
      assert.equal(normalizeSourceRoot(input), 'src', input);
    }
    assert.equal(normalizeSourceRoot('.\\\\packages\\\\x'), 'packages/x');
  });

  it('rejects paths outside the package', () => {
    for (const input of ['.', '..', '../src', '/abs', '']) {
      assert.throws(() => normalizeSourceRoot(input), /subdirectory of the package/, input);
    }
  });
});
