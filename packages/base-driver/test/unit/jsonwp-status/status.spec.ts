import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {getSummaryByCode, statusCodes} from '../../../lib/index.js';

describe('jsonwp-status', function () {
  describe('codes', function () {
    it('should export code numbers and summaries', function () {
      for (const obj of Object.values(statusCodes)) {
        assert.ok(Object.hasOwn(obj, 'code'));
        assert.strictEqual(typeof obj.code, 'number');
        assert.ok(Object.hasOwn(obj, 'summary'));
        assert.strictEqual(typeof obj.summary, 'string');
      }
    });
  });
  describe('getSummaryByCode', function () {
    it('should get the summary for a code', function () {
      assert.strictEqual(getSummaryByCode(0), 'The command executed successfully.');
    });
    it('should convert codes to ints', function () {
      assert.strictEqual(getSummaryByCode('0'), 'The command executed successfully.');
    });
    it('should return an error string for unknown code', function () {
      assert.strictEqual(getSummaryByCode(1000), 'An error occurred');
    });
  });
});
