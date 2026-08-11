import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {validators} from '../../../lib/protocol/validators';

describe('validators', function () {
  describe('#setUrl', function () {
    it('should accept a parseable URL', function () {
      assert.doesNotThrow(() => validators.setUrl('http://example.com'));
      assert.doesNotThrow(() => validators.setUrl('about:blank'));
      assert.doesNotThrow(() => validators.setUrl('data:text/plain,hi'));
      assert.doesNotThrow(() => validators.setUrl('ftp://example.com'));
    });

    it('should reject an empty or unparseable string', function () {
      assert.throws(() => validators.setUrl(''), /'' must be a valid URL/);
      assert.throws(() => validators.setUrl('example.com'), /'example\.com' must be a valid URL/);
    });

    it('should reject a non-string url without throwing TypeError', function () {
      for (const url of [123, true, {}, [], null, undefined]) {
        assert.throws(
          () => validators.setUrl(url),
          (err: Error) => {
            assert.equal(err.name, 'Error');
            assert.match(err.message, /must be a valid URL/);
            assert.match(err.message, new RegExp(String(url).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
            return true;
          },
        );
      }
    });
  });
});
