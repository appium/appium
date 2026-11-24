import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {deriveComponents, deriveEdges} from '../../../lib/init/derive.js';
import {renderModel} from '../../../lib/init/render.js';

describe('init', () => {
  const files = [
    'lib/driver.ts',
    'lib/utils.ts',
    'lib/utils/hash.ts',
    'lib/web-execution/a.ts',
    'lib/2fa/b.ts',
    'lib/title/c.ts',
  ];
  const components = deriveComponents(files, 'lib');

  it('derives one component per top-level directory and per root file', () => {
    assert.deepEqual(
      components.map((c) => [c.id, c.paths]),
      [
        ['c2fa', 'lib/2fa/**'],
        ['title_', 'lib/title/**'],
        ['utils', 'lib/utils/**'],
        ['web-execution', 'lib/web-execution/**'],
        ['driver', 'lib/driver.ts'],
        ['utils_file', 'lib/utils.ts'],
      ],
    );
  });

  it('derives the dependencies between components', () => {
    const edges = deriveEdges(
      [
        ['lib/driver.ts', 'lib/utils/hash.ts'],
        ['lib/driver.ts', 'lib/utils.ts'],
        ['lib/utils/hash.ts', 'lib/utils/hash.ts'],
        ['lib/web-execution/a.ts', 'lib/driver.ts'],
      ],
      components,
    );
    assert.deepEqual(edges, ['driver -> utils', 'driver -> utils_file', 'web-execution -> driver']);
  });

  it('renders the model', () => {
    const {model, spec} = renderModel('@scope/pkg', components.slice(0, 1), []);
    assert.match(spec, /tag unenforced/);
    assert.match(model, /scope-pkg = container '@scope\/pkg'/);
    assert.match(model, /metadata \{ paths 'lib\/2fa\/\*\*' \}/);
  });
});
