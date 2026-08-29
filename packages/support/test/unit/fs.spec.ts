import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {after, afterEach, before, beforeEach, describe, it} from 'node:test';

import {createSandbox} from 'sinon';
import {exec} from 'teen_process';

import {fs, system, tempDir} from '../../lib/index.js';

const TEST_TIMEOUT = 10000;

describe('fs', {timeout: TEST_TIMEOUT}, function () {
  const existingPath = import.meta.filename;
  let sandbox: ReturnType<typeof createSandbox>;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('mkdir()', function () {
    const dirName = path.resolve(import.meta.dirname, 'tmp');

    it('should make a directory that does not exist', async function () {
      await fs.rimraf(dirName);
      await fs.mkdir(dirName);
      const exists = await fs.hasAccess(dirName);
      assert.strictEqual(exists, true);
    });

    it('should not complain if the dir already exists', async function () {
      const exists = await fs.hasAccess(dirName);
      assert.strictEqual(exists, true);
      await fs.mkdir(dirName);
    });

    it('should still throw an error if something else goes wrong', async function () {
      await assert.rejects(fs.mkdir('/bin/foo'));
    });
  });

  it('hasAccess()', async function () {
    assert.ok(await fs.exists(existingPath));
    const nonExistingPath = path.resolve(import.meta.dirname, 'wrong-specs.js');
    assert.ok(!(await fs.hasAccess(nonExistingPath)));
  });

  it('exists()', async function () {
    assert.ok(await fs.exists(existingPath));
    const nonExistingPath = path.resolve(import.meta.dirname, 'wrong-specs.js');
    assert.ok(!(await fs.exists(nonExistingPath)));
  });

  it('readFile()', async function () {
    assert.ok((await fs.readFile(existingPath, 'utf8')).includes('readFile'));
  });

  describe('copyFile()', function () {
    it('should be able to copy a file', async function () {
      const newPath = path.resolve(await tempDir.openDir(), 'fs-specs.js');
      await fs.copyFile(existingPath, newPath);
      assert.ok((await fs.readFile(newPath, 'utf8')).includes('readFile'));
    });

    it('should throw an error if the source does not exist', async function () {
      await assert.rejects(fs.copyFile('/sdfsdfsdfsdf', '/tmp/bla'));
    });

    it('should honor filter when copying a directory', async function () {
      const srcDir = path.resolve(await tempDir.openDir(), 'copy-src');
      const destDir = path.resolve(await tempDir.openDir(), 'copy-dest');
      await mkdir(srcDir);
      await writeFile(path.join(srcDir, 'keep.txt'), 'keep');
      await writeFile(path.join(srcDir, 'skip.txt'), 'skip');

      await fs.copyFile(srcDir, destDir, {
        filter: (filename) => !filename.endsWith('skip.txt'),
      });

      assert.strictEqual(await fs.exists(path.join(destDir, 'keep.txt')), true);
      assert.strictEqual(await fs.exists(path.join(destDir, 'skip.txt')), false);
    });
  });

  it('rimraf()', async function () {
    const newPath = path.resolve(await tempDir.openDir(), 'fs-specs.js');
    await fs.copyFile(existingPath, newPath);
    assert.strictEqual(await fs.exists(newPath), true);
    await fs.rimraf(newPath);
    assert.strictEqual(await fs.exists(newPath), false);
  });

  it('sanitizeName()', function () {
    assert.strictEqual(
      fs.sanitizeName(':file?.txt', {
        replacement: '-',
      }),
      '-file-.txt',
    );
  });

  it('rimrafSync()', async function () {
    const newPath = path.resolve(await tempDir.openDir(), 'fs-specs.js');
    await fs.copyFile(existingPath, newPath);
    assert.strictEqual(await fs.exists(newPath), true);
    fs.rimrafSync(newPath);
    assert.strictEqual(await fs.exists(newPath), false);
  });

  describe('md5()', {timeout: 1200000}, function () {
    let smallFilePath: string;
    let bigFilePath: string;
    before(async function () {
      // Get the path of a small file (this source file).
      smallFilePath = existingPath;
      // Create a large file to test, about 163840000 bytes.
      bigFilePath = path.resolve(await tempDir.openDir(), 'enormous.txt');
      const file = await fs.open(bigFilePath, 'w');
      let fileData = '';
      for (let i = 0; i < 4096; i++) {
        fileData += '1';
      }
      for (let i = 0; i < 40000; i++) {
        await fs.write(file, fileData);
      }
      await fs.close(file);
    });
    after(async function () {
      await fs.unlink(bigFilePath);
    });
    it('should calculate hash of correct length', async function () {
      assert.strictEqual((await fs.md5(smallFilePath)).length, 32);
    });

    it('should be able to run on huge file', async function () {
      assert.strictEqual((await fs.md5(bigFilePath)).length, 32);
    });
  });

  describe('hash()', function () {
    it('should calculate sha1 hash', async function () {
      assert.strictEqual((await fs.hash(existingPath, 'sha1')).length, 40);
    });
    it('should calculate md5 hash', async function () {
      assert.strictEqual((await fs.hash(existingPath, 'md5')).length, 32);
    });
  });
  it('stat()', async function () {
    const stat = await fs.stat(existingPath);
    assert.ok('atime' in stat);
  });
  describe('which()', {skip: system.isWindows()}, function () {
    it('should find correct executable', async function () {
      const systemNpmPath = (await exec('which', ['npm'])).stdout.trim();
      const npmPath = await fs.which('npm');
      assert.strictEqual(npmPath, systemNpmPath);
    });
    it('should fail gracefully', async function () {
      await assert.rejects(fs.which('something_that_does_not_exist'));
    });
  });
  it('glob()', async function () {
    const glob = '*.spec.js';
    const tests = await fs.glob(glob, {cwd: import.meta.dirname});
    assert.ok(Array.isArray(tests));
    assert.ok(tests.length > 2);
  });

  describe('walkDir()', function () {
    it('walkDir recursive', async function () {
      assert.notStrictEqual(
        await fs.walkDir(import.meta.dirname, true, (item) => item.endsWith(`logger${path.sep}helpers.js`)),
        null,
      );
    });
    it('should walk all elements recursive', async function () {
      assert.strictEqual(
        await fs.walkDir(path.join(import.meta.dirname, '..', 'e2e', 'fixture'), true, () => undefined),
        null,
      );
    });
    it('should throw error through callback', async function () {
      const err = new Error('Callback error');
      const stub = sandbox.stub().rejects(err);
      await assert.rejects(fs.walkDir(import.meta.dirname, true, stub), err);
      assert.strictEqual(stub.calledOnce, true);
    });
    it('should traverse non-recursively', async function () {
      const filePath = await fs.walkDir(import.meta.dirname, false, (item) => item.endsWith('logger/helpers.js'));
      assert.strictEqual(filePath, null);
    });
  });

});
