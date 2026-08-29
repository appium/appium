import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {adler32} from '../../../lib/utils/hash.js';

describe('utils/hash', function () {
  describe('adler32()', function () {
    it('should compute checksum for known inputs', function () {
      assert.strictEqual(adler32(''), 1);
      assert.strictEqual(adler32('hello'), 103547413);
      assert.strictEqual(adler32('😀'), 122749608);
    });

    it('should support checksum seeding', function () {
      const seed = adler32('hello');
      assert.strictEqual(adler32(' world', seed), adler32('hello world'));
    });
  });
});
