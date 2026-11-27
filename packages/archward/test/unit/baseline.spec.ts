import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {diffAgainstBaseline} from '../../lib/baseline.js';

describe('diffAgainstBaseline', () => {
  it('splits keys into new and stale', () => {
    assert.deepEqual(diffAgainstBaseline(['a', 'b'], ['b', 'c']), {added: ['a'], stale: ['c']});
  });

  it('sorts both lists', () => {
    assert.deepEqual(diffAgainstBaseline(['z', 'y'], ['x', 'w']), {added: ['y', 'z'], stale: ['w', 'x']});
  });
});
