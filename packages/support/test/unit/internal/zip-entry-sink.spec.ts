import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {normalizeConcurrency} from '../../../lib/internal/zip-entry-sink.js';

describe('normalizeConcurrency()', function () {
  it('should use the default for missing and invalid values', function () {
    assert.strictEqual(normalizeConcurrency(), 4);
    assert.strictEqual(normalizeConcurrency(NaN), 4);
    assert.strictEqual(normalizeConcurrency(-Infinity), 4);
  });

  it('should keep the count within the bounds', function () {
    assert.strictEqual(normalizeConcurrency(Infinity), 64);
    assert.strictEqual(normalizeConcurrency(1000), 64);
    assert.strictEqual(normalizeConcurrency(0), 1);
    assert.strictEqual(normalizeConcurrency(-3), 1);
  });

  it('should round down', function () {
    assert.strictEqual(normalizeConcurrency(2.9), 2);
    assert.strictEqual(normalizeConcurrency(8), 8);
  });
});
