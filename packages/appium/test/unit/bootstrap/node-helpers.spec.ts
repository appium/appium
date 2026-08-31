import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {describe, it, beforeEach, afterEach, before, after} from 'node:test';

import {adjustNodePath, checkNodeOk, requireDir} from '../../../lib/bootstrap/node-helpers';

describe('bootstrap/node-helpers', function () {
  describe('checkNodeOk()', function () {
    const _process = process;

    before(function () {
      process = {...process}; // eslint-disable-line no-global-assign
    });

    after(function () {
      process = _process; // eslint-disable-line no-global-assign
    });

    describe('unsupported nodes', function () {
      const unsupportedVersions = [
        'v0.1',
        'v0.9.12',
        'v0.10.36',
        'v0.12.14',
        'v4.4.7',
        'v5.7.0',
        'v6.3.1',
        'v7.1.1',
        'v8.0.0',
        'v9.2.3',
        'v10.1.0',
        'v11.0.0',
        'v12.0.0',
        'v14.0.0',
        'v14.17.0',
        'v14.17.5',
        'v16.0.0',
        'v20.18.0',
        'v22.10.0',
      ];

      for (const version of unsupportedVersions) {
        it(`should fail if node is ${version}`, function () {
          // @ts-expect-error
          process.version = version;
          assert.throws(checkNodeOk);
        });
      }
    });

    describe('supported nodes', function () {
      it('should succeed if node is ^20.19.0', function () {
        // @ts-expect-error
        process.version = 'v20.19.0';
        assert.doesNotThrow(checkNodeOk);
        // @ts-expect-error
        process.version = 'v20.100.0';
        assert.doesNotThrow(checkNodeOk);
      });

      it('should succeed if node is 22.12+', function () {
        // @ts-expect-error
        process.version = 'v22.12.0';
        assert.doesNotThrow(checkNodeOk);
        // @ts-expect-error
        process.version = 'v100.0.0';
        assert.doesNotThrow(checkNodeOk);
      });
    });
  });

  describe('requireDir()', function () {
    it('should fail to use a dir with incorrect permissions', async function () {
      await assert.rejects(requireDir('/private/if_you_run_with_sudo_this_wont_fail'), /must exist/);
    });

    it('should fail to use an undefined dir', async function () {
      // @ts-expect-error
      await assert.rejects(requireDir(), /must exist/);
    });

    it('should fail to use a non-writeable dir', async function () {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'appium-requireDir-test-'));
      try {
        await fs.chmod(tempDir, 0o444);
        await assert.rejects(requireDir(tempDir), /must be writeable/);
      } finally {
        await fs.chmod(tempDir, 0o700);
        await fs.rmdir(tempDir);
      }
    });

    it('should be able to use a dir with correct permissions', async function () {
      await assert.doesNotReject(requireDir('/tmp/test_tmp_dir/with/any/number/of/levels'));
    });
  });

  describe('adjustNodePath()', function () {
    const prevValue = process.env.NODE_PATH;

    beforeEach(function () {
      if (process.env.NODE_PATH) {
        delete process.env.NODE_PATH;
      }
    });

    afterEach(function () {
      if (prevValue) {
        process.env.NODE_PATH = prevValue;
      }
    });

    it('should adjust NODE_PATH', async function () {
      adjustNodePath();
      await assert.doesNotReject(fs.access(process.env.NODE_PATH!));
    });
  });
});
