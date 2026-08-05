import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {ExecuteDriverPlugin} from '../../lib/plugin.js';

describe('execute driver plugin', function () {
  it('should exist', function () {
    assert.ok(ExecuteDriverPlugin);
  });
});
