import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {npmPackage} from '../../../lib/utils/package-json.js';

describe('utils/package-json', function () {
  describe('npmPackage', function () {
    it('should expose package metadata', function () {
      assert.strictEqual(npmPackage.name, 'appium');
    });
  });
});
