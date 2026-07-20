import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it} from 'node:test';

import {fs, node} from '@appium/support';

import {TEST_FIXTURES_DIR} from '../../../lib/test-pages/static-dir';

describe('test page static directory', function () {
  it('should resolve the bundled test fixtures', async function () {
    const pkgRoot = node.getModuleRootSync('@appium/base-driver', __filename);
    assert.notEqual(pkgRoot, null);
    assert.equal(TEST_FIXTURES_DIR, path.join(pkgRoot!, 'test-fixtures', 'static'));
    assert.ok((await fs.stat(TEST_FIXTURES_DIR)).isDirectory());
  });
});
