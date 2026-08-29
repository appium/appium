import assert from 'node:assert/strict';
import path from 'node:path';
import {afterEach, beforeEach, describe, it} from 'node:test';

import {fs, tempDir} from '../../lib/index.js';
import {downloadFile} from '../../lib/net.js';

describe('#net', function () {
  let tmpRoot: string;

  beforeEach(async function () {
    tmpRoot = await tempDir.openDir();
  });

  afterEach(async function () {
    await fs.rimraf(tmpRoot);
  });

  describe('downloadFile()', function () {
    it('should download file into the target folder', async function () {
      const dstPath = path.join(tmpRoot, 'download.tmp');
      await downloadFile('https://appium.io/docs/en/2.0/assets/images/appium-logo-white.png', dstPath);
      assert.strictEqual(await fs.exists(dstPath), true);
    });
  });
});
