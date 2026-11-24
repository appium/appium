import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {allowedEdges, buildOwnership} from '../../lib/model.js';
import type {ArchitectureModel} from '../../lib/types.js';

const model: ArchitectureModel = {
  elements: {
    'a.x': {id: 'a.x', kind: 'component', metadata: {paths: ['lib/x/**']}},
    'a.y': {id: 'a.y', kind: 'component', metadata: {paths: 'lib/y.ts'}},
    'a.t': {id: 'a.t', kind: 'component', tags: ['unenforced'], metadata: {paths: 'types/**'}},
    a: {id: 'a', kind: 'container'},
  },
  relations: {
    r1: {source: {model: 'a.x'}, target: {model: 'a.y'}},
    r2: {source: {model: 'a.x'}, target: {model: 'a.t'}},
    r3: {source: {model: 'a.x'}, target: {model: 'ext'}},
  },
};

describe('model', () => {
  it('maps files to enforced components only', () => {
    const {ownerOf, componentIds} = buildOwnership(model);
    assert.equal(ownerOf('lib/x/f.ts'), 'a.x');
    assert.equal(ownerOf('lib/y.ts'), 'a.y');
    assert.equal(ownerOf('types/i.ts'), undefined);
    assert.deepEqual([...componentIds].sort(), ['a.x', 'a.y']);
  });

  it('keeps only edges between enforced components', () => {
    const {componentIds} = buildOwnership(model);
    assert.deepEqual([...allowedEdges(model, componentIds)], ['a.x -> a.y']);
  });
});
