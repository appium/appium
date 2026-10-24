import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {errors} from '../../../lib/protocol/errors.js';
import {validators} from '../../../lib/protocol/validators.js';

describe('validators', function () {
  describe('#setUrl', function () {
    it('should accept a parseable URL', function () {
      assert.doesNotThrow(() => validators.setUrl('http://example.com'));
      assert.doesNotThrow(() => validators.setUrl('about:blank'));
      assert.doesNotThrow(() => validators.setUrl('data:text/plain,hi'));
      assert.doesNotThrow(() => validators.setUrl('ftp://example.com'));
    });

    it('should reject an empty or unparseable string', function () {
      assert.throws(() => validators.setUrl(''), {
        constructor: errors.InvalidArgumentError,
        message: "'' must be a valid URL",
      });
      assert.throws(() => validators.setUrl('example.com'), {
        constructor: errors.InvalidArgumentError,
        message: "'example.com' must be a valid URL",
      });
    });

    it('should reject a non-string url without throwing TypeError', function () {
      for (const url of [123, true, {}, [], null, undefined, {toString: null}]) {
        assert.throws(
          () => validators.setUrl(url),
          (err: Error) => {
            assert.ok(err instanceof errors.InvalidArgumentError);
            assert.equal(err.message, 'The url parameter must be a valid URL');
            return true;
          },
        );
      }
    });
  });
});
