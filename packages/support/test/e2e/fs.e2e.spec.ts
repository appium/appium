import assert from 'node:assert/strict';
import path from 'node:path';
import {afterEach, beforeEach, describe, it} from 'node:test';

import {fs} from '../../lib/fs.js';
import {isWindows} from '../../lib/system.js';
import {openDir} from '../../lib/tempdir.js';

describe('fs', function () {
  describe('mv()', function () {
    let srcRoot: string | undefined;
    let dstRoot: string | undefined;

    beforeEach(async function () {
      srcRoot = await openDir();
      dstRoot = await openDir();
    });

    afterEach(async function () {
      await Promise.all([srcRoot, dstRoot].filter((p): p is string => p != null).map((p) => fs.rimraf(p)));
      srcRoot = dstRoot = undefined;
    });

    it('should move file', async function () {
      const srcPath = path.join(srcRoot!, 'src.file');
      await fs.writeFile(srcPath, Buffer.from('bar'));
      const dstPath = path.join(dstRoot!, path.basename(srcPath));
      await fs.mv(srcPath, dstPath);
      assert.strictEqual(await fs.exists(path.join(dstRoot!, path.basename(srcPath))), true);
      assert.strictEqual(await fs.exists(path.join(srcRoot!, path.basename(srcPath))), false);
    });

    it('should move folder', async function () {
      const srcPath = path.join(srcRoot!, 'foo', 'src.file');
      await fs.mkdirp(path.dirname(srcPath));
      await fs.writeFile(srcPath, Buffer.from('bar'));
      await fs.mv(srcRoot!, dstRoot!, {mkdirp: true});
      assert.strictEqual(await fs.exists(path.join(dstRoot!, path.basename(path.dirname(srcPath)))), true);
      assert.strictEqual(
        await fs.exists(path.join(dstRoot!, path.basename(path.dirname(srcPath)), path.basename(srcPath))),
        true,
      );
      assert.strictEqual(await fs.exists(path.join(srcRoot!, path.basename(path.dirname(srcPath)))), false);
    });

    it('should fail if source path does not exist', async function () {
      const srcPath = path.join(srcRoot!, 'src.file');
      const dstPath = path.join(dstRoot!, path.basename(srcPath));
      await assert.rejects(fs.mv(srcPath, dstPath));
    });

    it('should fail if destination path already exists and clobber is disabled', async function () {
      const srcPath = path.join(srcRoot!, 'src.file');
      await fs.writeFile(srcPath, Buffer.from('bar'));
      const dstPath = path.join(dstRoot!, path.basename(srcPath));
      await fs.writeFile(dstPath, Buffer.from('foo'));
      await assert.rejects(fs.mv(srcPath, dstPath, {clobber: false}));
      assert.strictEqual((await fs.readFile(dstPath)).toString(), 'foo');
    });

    it('should override a file if already exists by default', async function () {
      const srcPath = path.join(srcRoot!, 'src.file');
      await fs.writeFile(srcPath, Buffer.from('bar'));
      const dstPath = path.join(dstRoot!, path.basename(srcPath));
      await fs.writeFile(dstPath, Buffer.from('foo'));
      await fs.mv(srcPath, dstPath);
      assert.strictEqual((await fs.readFile(dstPath)).toString(), 'bar');
    });

    it('should handle cross-device move by falling back to copy-and-delete', async function () {
      const srcPath = path.join(srcRoot!, 'src.file');
      await fs.writeFile(srcPath, Buffer.from('bar'));
      const dstPath = path.join(dstRoot!, path.basename(srcPath));

      // Mock fs.rename to simulate EXDEV (cross-device) error so mv falls back to copy-and-delete.
      const originalRename = fs.rename;
      (fs as {rename: typeof fs.rename}).rename = async () => {
        const err = new Error('cross-device link not permitted') as NodeJS.ErrnoException;
        err.code = 'EXDEV';
        throw err;
      };

      try {
        await fs.mv(srcPath, dstPath);
        assert.strictEqual(await fs.exists(dstPath), true);
        assert.strictEqual(await fs.exists(srcPath), false);
        assert.strictEqual((await fs.readFile(dstPath)).toString(), 'bar');
      } finally {
        // Restore original function.
        (fs as {rename: typeof fs.rename}).rename = originalRename;
      }
    });
  });

  describe('isExecutable()', function () {
    describe('when the path does not exist', function () {
      it('should return `false`', async function () {
        assert.strictEqual(await fs.isExecutable('/path/to/nowhere'), false);
      });
    });

    describe('when the path exists', {skip: isWindows()}, function () {
      describe('when the path is not executable', function () {
        it('should return `false`', async function () {
          assert.strictEqual(await fs.isExecutable(import.meta.filename), false);
        });
      });

      describe('when the path is executable', function () {
        it('should return `true`', async function () {
          assert.strictEqual(await fs.isExecutable('/bin/bash'), true);
        });
      });
    });

    describe('when the parameter is not a path', function () {
      it('should return `false`', async function () {
        assert.strictEqual(await fs.isExecutable(undefined as unknown as string), false);
      });
    });
  });
});
