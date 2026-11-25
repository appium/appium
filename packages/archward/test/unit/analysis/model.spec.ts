import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {allowedEdges, buildOwnership, parseModel} from '../../../lib/analysis/model.js';
import type {ArchitectureModel} from '../../../lib/types.js';

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
  it('maps files to the components that own them, enforced or not', () => {
    const {ownersOf, componentIds} = buildOwnership(model);
    assert.deepEqual(ownersOf('lib/x/f.ts'), ['a.x']);
    assert.deepEqual(ownersOf('lib/y.ts'), ['a.y']);
    assert.deepEqual(ownersOf('types/i.ts'), ['a.t']);
    assert.deepEqual(ownersOf('other/i.ts'), []);
    assert.deepEqual([...componentIds].sort(), ['a.x', 'a.y']);
  });

  it('matches globs, including `**` over zero directories and `?`', () => {
    const {ownersOf} = buildOwnership({
      elements: {
        'a.i': {id: 'a.i', kind: 'component', metadata: {paths: 'lib/**/index.ts'}},
        'a.q': {id: 'a.q', kind: 'component', metadata: {paths: 'lib/q?.ts'}},
      },
      relations: {},
    });
    assert.deepEqual(ownersOf('lib/index.ts'), ['a.i']);
    assert.deepEqual(ownersOf('lib/a/b/index.ts'), ['a.i']);
    assert.deepEqual(ownersOf('lib/q1.ts'), ['a.q']);
    assert.deepEqual(ownersOf('lib/q.ts'), []);
  });

  it('keeps only edges between enforced components', () => {
    const {componentIds} = buildOwnership(model);
    assert.deepEqual([...allowedEdges(model, componentIds)], ['a.x -> a.y']);
  });

  it('rejects an unexpected export format', () => {
    assert.throws(() => parseModel({}), /unexpected `likec4 export json` format/);
    assert.throws(() => parseModel(null), /unexpected `likec4 export json` format/);
    assert.equal(parseModel(model), model);
  });
});
