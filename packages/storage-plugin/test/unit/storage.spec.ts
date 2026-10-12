import assert from 'node:assert/strict';
import path from 'node:path';
import {Readable} from 'node:stream';
import {after, afterEach, before, beforeEach, describe, it} from 'node:test';

import {fs, logger, tempDir} from '@appium/support';
import {errors, getResponseForW3CError} from 'appium/driver.js';

import {Storage, StorageArgumentError, validateStorageItemName} from '../../lib/storage.js';

const log = logger.getLogger();

describe('storage', function () {
  let tmpRoot: string | undefined;
  let storage: Storage | null;
  let storageRoot: string | undefined;

  before(async function () {
    tmpRoot = await tempDir.openDir();
  });

  after(async function () {
    if (tmpRoot && (await fs.exists(tmpRoot))) {
      await fs.rimraf(tmpRoot);
    }
  });

  beforeEach(async function () {
    storageRoot = await tempDir.openDir();
  });

  afterEach(async function () {
    if (storage) {
      await storage.reset();
      storage = null;
    }
    if (storageRoot && (await fs.exists(storageRoot))) {
      await fs.rimraf(storageRoot);
      storageRoot = undefined;
    }
  });

  it('should be initially empty', async function () {
    storage = new Storage(storageRoot!, false, false, log);
    const files = await storage.list();
    assert.strictEqual(files.length, 0);
    assert.strictEqual(await storage.delete('foo'), false);
  });

  it('should reset all files if shouldPreserveFiles is not requested', async function () {
    const name = 'foo.bar';
    const tmpName = 'bar.baz.filepart';
    await fs.writeFile(path.join(storageRoot!, name), Buffer.alloc(1));
    await fs.writeFile(path.join(storageRoot!, tmpName), Buffer.alloc(1));
    storage = new Storage(storageRoot!, true, false, log);
    const files = await storage.list();
    assert.strictEqual(files.length, 1);
    await storage.reset();
    assert.strictEqual(await fs.exists(path.join(storageRoot!, name)), false);
    assert.strictEqual(await fs.exists(path.join(storageRoot!, tmpName)), false);
  });

  it('should only reset partial files if shouldPreserveFiles requested', async function () {
    const name = 'foo.bar';
    const tmpName = 'bar.baz.filepart';
    await fs.writeFile(path.join(storageRoot!, name), Buffer.alloc(1));
    await fs.writeFile(path.join(storageRoot!, tmpName), Buffer.alloc(1));
    storage = new Storage(storageRoot!, true, true, log);
    let files = await storage.list();
    assert.strictEqual(files.length, 1);
    await storage.reset();
    files = await storage.list();
    assert.strictEqual(files.length, 1);
    assert.strictEqual(await fs.exists(path.join(storageRoot!, tmpName)), false);
  });

  it('should perform basic operations', async function () {
    storage = new Storage(storageRoot!, false, false, log);
    const name = 'foo.bar';
    const size = 1 * 1024 * 1024;
    await addFileToStorage(name, size);
    let files = await storage.list();
    assert.notStrictEqual(files.length, 0);
    assert.strictEqual(files[0].name, name);
    assert.strictEqual(files[0].size, size);
    assert.strictEqual(files[0].path, path.join(storageRoot!, name));
    assert.strictEqual(await storage.delete(name), true);
    files = await storage.list();
    assert.strictEqual(files.length, 0);
  });

  it('should be reset and preserve the root', async function () {
    storage = new Storage(storageRoot!, true, false, log);
    const name = 'foo.bar';
    const size = 1 * 1024 * 1024;
    await addFileToStorage(name, size);
    await storage.reset();
    const files = await storage.list();
    assert.strictEqual(files.length, 0);
    assert.strictEqual(await fs.exists(storageRoot!), true);
  });

  it('should be reset and preserve items', async function () {
    storage = new Storage(storageRoot!, false, true, log);
    const name = 'foo.bar';
    const size = 1 * 1024 * 1024;
    await addFileToStorage(name, size);
    await storage.reset();
    const files = await storage.list();
    assert.notStrictEqual(files.length, 0);
    assert.strictEqual(await fs.exists(storageRoot!), true);
  });

  for (const name of ['app.filepart', 'app.FILEPART', 'app.FilePart']) {
    it(`should reject reserved storage name ${name} before writing`, async function () {
      storage = new Storage(storageRoot!, true, true, log);
      await assert.rejects(
        storage.add({name, sha1: 'da39a3ee5e6b4b0d3255bfef95601890afd80709'}, Readable.from([])),
        StorageArgumentError,
      );
      assert.deepEqual(await fs.readdir(storageRoot!), []);
    });
  }

  describe('validateStorageItemName', function () {
    it('should allow the reserved suffix inside a name', function () {
      assert.doesNotThrow(() => validateStorageItemName('app.filepart.apk'));
    });
    it('should accept valid file names', function () {
      assert.doesNotThrow(() => validateStorageItemName('foo.bar'));
      assert.doesNotThrow(() => validateStorageItemName('foo-bar_baz'));
    });

    it('should reject names that must be sanitized', function () {
      assert.throws(
        () => validateStorageItemName('foo/bar'),
        (err: unknown) => {
          assert.ok(err instanceof StorageArgumentError);
          assert.strictEqual(
            (err as Error).message,
            "The provided name value 'foo/bar' must be a valid file name. Did you mean 'foo_bar'?",
          );
          return true;
        },
      );
    });

    it('should reject empty file names', function () {
      assert.throws(
        () => validateStorageItemName(''),
        (err: unknown) => {
          assert.ok(err instanceof StorageArgumentError);
          assert.strictEqual((err as Error).message, "The provided file name '' must not be empty");
          return true;
        },
      );
    });

    it('should reject file names starting with a dot', function () {
      for (const name of ['.env', '.DS_Store']) {
        assert.throws(
          () => validateStorageItemName(name),
          (err: unknown) => {
            assert.ok(err instanceof StorageArgumentError);
            assert.strictEqual((err as Error).message, `The provided file name '${name}' must not start with a dot`);
            return true;
          },
        );
      }
    });

    it('should be reported as a W3C invalid argument', function () {
      try {
        validateStorageItemName('foo/bar');
        assert.fail('expected validateStorageItemName to throw');
      } catch (err) {
        assert.ok(err instanceof errors.InvalidArgumentError);
        const [status, body] = getResponseForW3CError(err);
        assert.strictEqual(status, 400);
        assert.strictEqual(body.value.error, 'invalid argument');
      }
    });
  });

  async function addFileToStorage(name: string, size: number): Promise<string> {
    const dummyPath = path.join(tmpRoot!, name);
    await fs.writeFile(dummyPath, Buffer.alloc(size));
    const sha1 = await fs.hash(dummyPath);
    await storage!.add({name, sha1}, fs.createReadStream(dummyPath));
    return dummyPath;
  }
});
