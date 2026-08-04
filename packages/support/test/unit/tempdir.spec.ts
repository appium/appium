import assert from 'node:assert/strict';
import {afterEach, describe, it} from 'node:test';

import {fs, tempDir} from '../../lib';

describe('tempdir', function () {
  afterEach(function () {
    delete process.env.APPIUM_TMP_DIR;
  });

  it('should be able to generate a path', async function () {
    const path = await tempDir.path({prefix: 'myfile', suffix: '.tmp'});
    assert.ok(path);
    assert.ok(path.includes('myfile.tmp'));
  });

  it('should be able to generate a path with process.env.APPIUM_TMP_DIR', async function () {
    const preRootDirPath = await tempDir.openDir();
    process.env.APPIUM_TMP_DIR = preRootDirPath;

    const path = await tempDir.path({prefix: 'myfile', suffix: '.tmp'});
    assert.ok(path);
    assert.ok(path.includes(preRootDirPath));
    assert.ok(path.includes('myfile.tmp'));
  });

  it('should be able to create a temp file', async function () {
    const res = await tempDir.open({prefix: 'my-test-file', suffix: '.zip'});
    assert.ok(res);
    assert.ok(res.path);
    assert.ok(res.path.includes('my-test-file.zip'));
    assert.ok(res.fd);
    assert.ok(await fs.exists(res.path));
  });

  it('should be able to create a temp file with process.env.APPIUM_TMP_DIR', async function () {
    const preRootDirPath = await tempDir.openDir();
    process.env.APPIUM_TMP_DIR = preRootDirPath;

    const res = await tempDir.open({prefix: 'my-test-file', suffix: '.zip'});
    assert.ok(res);
    assert.ok(res.path);
    assert.ok(res.path.includes(preRootDirPath));
    assert.ok(res.path.includes('my-test-file.zip'));
    assert.ok(res.fd);
    assert.ok(await fs.exists(res.path));
  });

  it('should generate a random temp dir', async function () {
    const res = await tempDir.openDir();
    assert.strictEqual(typeof res, 'string');
    assert.ok(await fs.exists(res));
    const res2 = await tempDir.openDir();
    assert.ok(await fs.exists(res2));
    assert.notStrictEqual(res, res2);
  });

  it('should generate a random temp dir, but the same with process.env.APPIUM_TMP_DIR', async function () {
    const preRootDirPath = await tempDir.openDir();
    process.env.APPIUM_TMP_DIR = preRootDirPath;

    const res = await tempDir.openDir();
    assert.strictEqual(typeof res, 'string');
    assert.ok(await fs.exists(res));
    const res2 = await tempDir.openDir();
    assert.ok(await fs.exists(res2));
    assert.ok(res.includes(preRootDirPath));
    assert.ok(res2.includes(preRootDirPath));
    assert.notStrictEqual(res, res2);
  });

  it('should generate one temp dir used for the life of the process', async function () {
    const res = await tempDir.staticDir();
    assert.strictEqual(typeof res, 'string');
    assert.ok(await fs.exists(res));
    const res2 = await tempDir.staticDir();
    assert.ok(await fs.exists(res2));
    assert.strictEqual(res, res2);
  });
});
