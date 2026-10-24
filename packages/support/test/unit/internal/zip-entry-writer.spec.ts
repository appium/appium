import assert from 'node:assert/strict';
import path from 'node:path';
import {Readable} from 'node:stream';
import {afterEach, beforeEach, describe, it} from 'node:test';

import {fs, tempDir} from '../../../lib/index.js';
import {type ExtractableEntry, ZipEntryWriter} from '../../../lib/internal/zip-entry-writer.js';
import {isWindows} from '../../../lib/system.js';

function entry(fileName: string, content: string | null, extra: Partial<ExtractableEntry> = {}): ExtractableEntry {
  return {
    fileName,
    mode: 0,
    isDir: content === null,
    isSymlink: false,
    openBody: async () => Readable.from([Buffer.from(content ?? '')]),
    ...extra,
  };
}

describe('ZipEntryWriter', function () {
  let root: string;
  let writer: ZipEntryWriter;

  beforeEach(async function () {
    root = await fs.realpath(await tempDir.openDir());
    writer = new ZipEntryWriter({dir: root});
  });

  afterEach(async function () {
    await fs.rimraf(root);
  });

  it('should write files and create parent folders', async function () {
    await writer.write(entry('a/b/c.txt', 'hello'));
    assert.strictEqual(await fs.readFile(path.join(root, 'a/b/c.txt'), 'utf8'), 'hello');
  });

  it('should create explicit folders', async function () {
    await writer.write(entry('d/', null));
    assert.ok((await fs.stat(path.join(root, 'd'))).isDirectory());
  });

  it('should skip __MACOSX entries', async function () {
    await writer.write(entry('__MACOSX/._a', 'junk'));
    assert.strictEqual(await fs.exists(path.join(root, '__MACOSX')), false);
  });

  it('should reject entries escaping the root', async function () {
    await assert.rejects(writer.write(entry('../evil.txt', 'x')), /Out of bound path/);
  });

  it('should apply the mode from the entry', {skip: isWindows()}, async function () {
    await writer.write(entry('run.sh', 'x', {mode: 0o100755}));
    assert.strictEqual((await fs.stat(path.join(root, 'run.sh'))).mode & 0o777, 0o755);
  });

  it('should fall back to default modes', {skip: isWindows()}, async function () {
    const custom = new ZipEntryWriter({dir: root, defaultFileMode: '420'}); // 0o644 as decimal
    await custom.write(entry('f.txt', 'x'));
    assert.strictEqual((await fs.stat(path.join(root, 'f.txt'))).mode & 0o777, 0o644);
  });

  it('should reject symlinks pointing outside of the root', {skip: isWindows()}, async function () {
    await assert.rejects(writer.write(entry('link', '../../etc', {isSymlink: true})), /Out of bound symlink target/);
    assert.strictEqual(await fs.exists(path.join(root, 'link')), false);
  });

  it('should refuse to write through a symlink', {skip: isWindows()}, async function () {
    await writer.write(entry('target.txt', 'safe'));
    await writer.write(entry('link', 'target.txt', {isSymlink: true}));
    await assert.rejects(writer.write(entry('link', 'overwritten')), /over existing symlink|ELOOP/);
    assert.strictEqual(await fs.readFile(path.join(root, 'target.txt'), 'utf8'), 'safe');
  });

  describe('prepared files', function () {
    it('should create files exclusively and report it', async function () {
      const prepared = await writer.prepareFile('a/b.txt');
      const {file, created} = await writer.openPrepared(prepared);
      await file.close();
      assert.strictEqual(created, true);
      const again = await writer.openPrepared(prepared);
      await again.file.close();
      assert.strictEqual(again.created, false);
    });

    it('should replace read-only files', {skip: isWindows()}, async function () {
      await fs.writeFile(path.join(root, 'ro.txt'), 'old', {mode: 0o444});
      const {file} = await writer.openPrepared(await writer.prepareFile('ro.txt'));
      await file.writeFile('new');
      await file.close();
      assert.strictEqual(await fs.readFile(path.join(root, 'ro.txt'), 'utf8'), 'new');
    });

    it('should refuse to open through a symlink', {skip: isWindows()}, async function () {
      const outside = path.join(root, '..', `${path.basename(root)}-outside.txt`);
      await fs.writeFile(outside, 'original');
      try {
        await fs.symlink(outside, path.join(root, 'link'));
        await assert.rejects(writer.openPrepared(await writer.prepareFile('link')), /existing symlink/);
        assert.strictEqual(await fs.readFile(outside, 'utf8'), 'original');
      } finally {
        await fs.rimraf(outside);
      }
    });

    it('should reject names outside of the root', async function () {
      await assert.rejects(writer.prepareFile('../x'), /Out of bound path/);
    });
  });
});
