import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {findUnresolvedImports} from '../../../lib/analysis/graph.js';
import {mod} from './modules.js';

describe('findUnresolvedImports', () => {
  it('lists unresolved relative imports only', () => {
    const modules = [
      mod('lib/b.ts', [{module: './missing.js', couldNotResolve: true}]),
      mod('lib/a.ts', [
        {module: './missing.js', couldNotResolve: true},
        {module: 'not-installed', couldNotResolve: true},
        {module: './fine.js', resolved: 'lib/fine.ts'},
      ]),
    ];
    assert.deepEqual(findUnresolvedImports(modules), ['lib/a.ts -> ./missing.js', 'lib/b.ts -> ./missing.js']);
  });
});
