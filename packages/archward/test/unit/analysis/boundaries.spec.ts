import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {findBoundaries} from '../../../lib/analysis/boundaries.js';
import {allowedEdges, buildOwnership} from '../../../lib/analysis/model.js';
import type {ArchitectureModel} from '../../../lib/types.js';
import {mod} from './modules.js';

function context(paths: Record<string, string>, edges: [string, string][], unenforced: string[] = []) {
  const model: ArchitectureModel = {
    elements: Object.fromEntries(
      Object.entries(paths).map(([id, glob]) => [
        id,
        {id, kind: 'component', metadata: {paths: glob}, ...(unenforced.includes(id) ? {tags: ['unenforced']} : {})},
      ]),
    ),
    relations: Object.fromEntries(edges.map(([a, b], i) => [`r${i}`, {source: {model: a}, target: {model: b}}])),
  };
  const ownership = buildOwnership(model);
  return {prefix: 'lib/', ownership, allowed: allowedEdges(model, ownership.componentIds)};
}

const imp = (resolved: string) => ({module: `./${resolved}`, resolved});

describe('findBoundaries', () => {
  const paths = {a: 'lib/a/**', b: 'lib/b/**', c: 'lib/c/**'};

  it('reports imports between components that the model does not allow', () => {
    const result = findBoundaries(
      [mod('lib/a/x.ts', [imp('lib/b/y.ts'), imp('lib/c/z.ts')]), mod('lib/b/y.ts')],
      context(paths, [['a', 'b']]),
    );
    assert.deepEqual(result.boundaries, [{from: 'lib/a/x.ts', to: 'lib/c/z.ts', fromComponent: 'a', toComponent: 'c'}]);
    assert.deepEqual(result.unusedEdges, []);
  });

  it('reports files that no component owns, and allowed edges nobody uses', () => {
    const result = findBoundaries([mod('lib/stray.ts'), mod('lib/a/x.ts')], context(paths, [['a', 'b']]));
    assert.deepEqual(result.unownedFiles, ['lib/stray.ts']);
    assert.deepEqual(result.unusedEdges, ['a -> b']);
  });

  it('ignores files outside the source root, and imports within a component', () => {
    const result = findBoundaries(
      [mod('../other/x.ts', [imp('lib/b/y.ts')]), mod('lib/a/x.ts', [imp('lib/a/w.ts')])],
      context(paths, []),
    );
    assert.deepEqual(result, {unownedFiles: [], boundaries: [], unusedEdges: []});
  });

  it('owns, but does not check, the files of unenforced components', () => {
    const result = findBoundaries(
      [mod('lib/c/z.ts', [imp('lib/a/x.ts')]), mod('lib/a/x.ts', [imp('lib/c/z.ts')])],
      context(paths, [], ['c']),
    );
    assert.deepEqual(result, {unownedFiles: [], boundaries: [], unusedEdges: []});
  });

  it('rejects a file that belongs to several components', () => {
    assert.throws(
      () => findBoundaries([mod('lib/a/x.ts')], context({a: 'lib/a/**', all: 'lib/**'}, [])),
      /exactly one component[\s\S]*lib\/a\/x\.ts \(a, all\)/,
    );
  });
});
