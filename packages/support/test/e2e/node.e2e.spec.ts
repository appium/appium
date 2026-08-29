import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {node} from '../../lib/index.js';

describe('node utilities', function () {
  describe('requirePackage', function () {
    it('should be able to require a local package', async function () {
      await assert.doesNotReject(node.requirePackage('sinon'));
    });
    // XXX: see #15951
    it.skip('should be able to require a global package', async function () {
      await assert.doesNotReject(node.requirePackage('npm'));
    });
    it('should fail to find uninstalled package', async function () {
      await assert.rejects(node.requirePackage('appium-foo-driver'), /Unable to load package/);
    });
  });
});
