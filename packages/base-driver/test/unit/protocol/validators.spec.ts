import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {validators} from '../../../lib/protocol/validators';

describe('validators', function () {
  describe('#setUrl', function () {
    it('should accept a URL with a scheme', function () {
      assert.doesNotThrow(() => validators.setUrl('http://example.com'));
      assert.doesNotThrow(() => validators.setUrl('about:blank'));
      assert.doesNotThrow(() => validators.setUrl('data:text/plain,hi'));
    });

    it('should reject an empty or schemeless string', function () {
      assert.throws(() => validators.setUrl(''), /Url or Uri must start with/);
      assert.throws(() => validators.setUrl('example.com'), /Url or Uri must start with/);
    });

    it('should reject a non-string url without throwing TypeError', function () {
      for (const url of [123, true, {}, [], null, undefined]) {
        assert.throws(
          () => validators.setUrl(url),
          (err: Error) => {
            assert.equal(err.name, 'Error');
            assert.match(err.message, /Url or Uri must start with/);
            return true;
          },
        );
      }
    });
  });
});
