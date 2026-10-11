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

    it('should keep a file when the source and destination are the same path', async function () {
      const srcPath = path.join(srcRoot!, 'src.file');
      await fs.writeFile(srcPath, Buffer.from('bar'));
      await fs.mv(srcPath, path.join(srcRoot!, '.', 'src.file'));
      assert.strictEqual(await fs.exists(srcPath), true);
      assert.strictEqual((await fs.readFile(srcPath)).toString(), 'bar');
    });

    it('should not delete an empty directory when the destination is missing', async function () {
      const srcPath = path.join(srcRoot!, 'empty');
      await fs.mkdir(srcPath);
      const dstPath = path.join(dstRoot!, 'missing');
      await assert.rejects(fs.mv(srcPath, dstPath), /destination does not exist/);
      assert.strictEqual(await fs.exists(srcPath), true);
      assert.strictEqual(await fs.exists(dstPath), false);
    });

    for (const isDirectory of [false, true]) {
      for (const clobber of [false, true]) {
        it(
          `should change only name casing on Windows: directory=${isDirectory}, clobber=${clobber}`,
          {
            skip: !isWindows(),
          },
          async function () {
            const source = path.join(srcRoot!, 'app');
            const destination = path.join(srcRoot!, 'App');
            if (isDirectory) {
              await fs.mkdir(source);
              await fs.writeFile(path.join(source, 'payload'), 'keep');
            } else {
              await fs.writeFile(source, 'keep');
            }

            await fs.mv(source, destination, {clobber});

            assert.deepEqual(await fs.readdir(srcRoot!), ['App']);
            assert.equal(
              await fs.readFile(isDirectory ? path.join(destination, 'payload') : destination, 'utf8'),
              'keep',
            );
          },
        );
      }
    }

    it('should preserve a Windows directory junction pointing to the source', {skip: !isWindows()}, async function () {
      const source = path.join(srcRoot!, 'source');
      const alias = path.join(srcRoot!, 'alias');
      await fs.mkdir(source);
      await fs.writeFile(path.join(source, 'payload'), 'keep');
      await fs.symlink(source, alias, 'junction');

      await fs.mv(source, alias);

      assert.equal(await fs.readFile(path.join(source, 'payload'), 'utf8'), 'keep');
      assert.equal((await fs.lstat(alias)).isSymbolicLink(), true);
    });

    it('should not delete an empty directory when the destination is a file', async function () {
      const srcPath = path.join(srcRoot!, 'empty');
      await fs.mkdir(srcPath);
      const dstPath = path.join(dstRoot!, 'file');
      await fs.writeFile(dstPath, 'keep');
      await assert.rejects(fs.mv(srcPath, dstPath), /not a directory/);
      assert.strictEqual(await fs.exists(srcPath), true);
      assert.strictEqual(await fs.readFile(dstPath, 'utf8'), 'keep');
    });

    it('should keep an empty subdirectory when the destination directory already exists', async function () {
      const srcPath = path.join(srcRoot!, 'src');
      await fs.mkdirp(path.join(srcPath, 'empty'));
      await fs.writeFile(path.join(srcPath, 'note.txt'), 'keep');
      const dstPath = path.join(dstRoot!, 'dst');
      await fs.mkdir(dstPath);
      await fs.mv(srcPath, dstPath);
      assert.strictEqual(await fs.exists(srcPath), false);
      assert.strictEqual(await fs.readFile(path.join(dstPath, 'note.txt'), 'utf8'), 'keep');
      assert.strictEqual((await fs.stat(path.join(dstPath, 'empty'))).isDirectory(), true);
    });

    it('should move nested files into an existing destination directory', async function () {
      const srcPath = path.join(srcRoot!, 'src');
      await fs.mkdirp(path.join(srcPath, 'sub'));
      await fs.writeFile(path.join(srcPath, 'a.txt'), 'a');
      await fs.writeFile(path.join(srcPath, 'sub', 'b.txt'), 'b');
      const dstPath = path.join(dstRoot!, 'dst');
      await fs.mkdir(dstPath);
      await fs.mv(srcPath, dstPath);
      assert.strictEqual(await fs.exists(srcPath), false);
      assert.strictEqual(await fs.readFile(path.join(dstPath, 'a.txt'), 'utf8'), 'a');
      assert.strictEqual(await fs.readFile(path.join(dstPath, 'sub', 'b.txt'), 'utf8'), 'b');
    });

    it('should move an empty directory when mkdirp creates the destination', async function () {
      const srcPath = path.join(srcRoot!, 'empty');
      await fs.mkdir(srcPath);
      const dstPath = path.join(dstRoot!, 'moved');
      await fs.mv(srcPath, dstPath, {mkdirp: true});
      assert.strictEqual(await fs.exists(srcPath), false);
      assert.strictEqual((await fs.stat(dstPath)).isDirectory(), true);
    });

    it('should reject moving a directory into itself', async function () {
      const srcPath = path.join(srcRoot!, 'foo', 'src.file');
      await fs.mkdirp(path.dirname(srcPath));
      await fs.writeFile(srcPath, Buffer.from('bar'));
      await assert.rejects(
        fs.mv(path.dirname(srcPath), path.join(path.dirname(srcPath), 'child'), {mkdirp: true}),
        /inside the source/,
      );
      assert.strictEqual(await fs.exists(srcPath), true);
      assert.strictEqual((await fs.readFile(srcPath)).toString(), 'bar');
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
