import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {coerceScriptResult} from '../../lib/execute-child.js';

describe('coerceScriptResult', function () {
  it('should return null if the script result refers to itself', function () {
    const result: any = {};
    result.self = result;
    assert.strictEqual(coerceScriptResult(result), null);
  });
});
