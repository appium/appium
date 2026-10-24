import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {afterEach, beforeEach, describe, it} from 'node:test';

import {fs, tempDir} from '../../lib/index';
import {isWindows} from '../../lib/system';
import * as zip from '../../lib/zip';

function crc32(buf: Buffer): number {
  let table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface Entry {
  name: string;
  contents: string;
  mode: number;
}

function header(sig: number, fields: [number, number, number][]): Buffer {
  const buf = Buffer.alloc(46);
  for (const [offset, value, length] of fields) {
    if (length === 4) {
      buf.writeUInt32LE(value, offset);
    } else {
      buf.writeUInt16LE(value, offset);
    }
  }
  buf.writeUInt32LE(sig, 0);
  return buf.subarray(0, sig === 0x04034b50 ? 30 : 46);
}

function createStoredZip(dstPath: string, entries: Entry[]): void {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const contents = Buffer.from(entry.contents);
    const crc = crc32(contents);
    chunks.push(
      header(0x04034b50, [
        [4, 20, 2],
        [6, 0x800, 2],
        [8, 0, 2],
        [14, crc, 4],
        [18, contents.length, 4],
        [22, contents.length, 4],
        [26, name.length, 2],
        [28, 0, 2],
      ]),
      name,
      contents,
    );
    central.push(
      header(0x02014b50, [
        [4, (3 << 8) | 20, 2],
        [6, 20, 2],
        [8, 0x800, 2],
        [14, crc, 4],
        [20, contents.length, 4],
        [24, contents.length, 4],
        [28, name.length, 2],
        [30, 0, 2],
        [34, 0, 2],
        [36, 0, 2],
        [38, (entry.mode << 16) >>> 0, 4],
      ]),
      name,
    );
  }
  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(Buffer.concat(chunks).length, 16);
  writeFileSync(dstPath, Buffer.concat([...chunks, centralBuf, eocd]));
}

describe('readEntries/extractEntryTo hardening', function () {
  let tmpRoot: string;

  beforeEach(async function () {
    tmpRoot = await tempDir.openDir();
  });

  afterEach(async function () {
    try {
      await fs.rimraf(tmpRoot);
    } catch {
      // windows file-handle flakiness
    }
  });

  it('should extract a plain entry to the requested destination', async function () {
    const outputPath = path.resolve(tmpRoot, 'output');
    await fs.mkdirp(outputPath);
    const dstPath = path.resolve(tmpRoot, 'plain.zip');
    createStoredZip(dstPath, [{name: 'plain.txt', contents: 'HELLO\n', mode: 0o100644}]);
    await zip.readEntries(dstPath, async ({entry, extractEntryTo}) => {
      await extractEntryTo(outputPath);
    });
    assert.strictEqual(await fs.readFile(path.resolve(outputPath, 'plain.txt'), 'utf8'), 'HELLO\n');
  });

  it(
    'should refuse to write through a pre-existing symlink in the destination',
    {skip: isWindows()},
    async function () {
      const outputPath = path.resolve(tmpRoot, 'output');
      const escapePath = path.resolve(tmpRoot, 'escape');
      await fs.mkdirp(path.resolve(outputPath, 'pwn'));
      await fs.mkdir(escapePath);
      await fs.symlink(escapePath, path.resolve(outputPath, 'pwn', 'out'));
      const dstPath = path.resolve(tmpRoot, 'entry.zip');
      createStoredZip(dstPath, [{name: 'pwn/out/owned.txt', contents: 'PWNED\n', mode: 0o100644}]);
      await assert.rejects(
        zip.readEntries(dstPath, async ({extractEntryTo}) => {
          await extractEntryTo(outputPath);
        }),
        /Out of bound/,
      );
      assert.strictEqual(await fs.exists(path.resolve(escapePath, 'owned.txt')), false);
    },
  );

  it('should refuse to overwrite an existing symlink with file contents', {skip: isWindows()}, async function () {
    const outputPath = path.resolve(tmpRoot, 'output');
    const escapePath = path.resolve(tmpRoot, 'escape');
    await fs.mkdirp(outputPath);
    await fs.mkdir(escapePath);
    const victim = path.resolve(escapePath, 'victim.txt');
    await fs.writeFile(victim, 'original');
    await fs.symlink(victim, path.resolve(outputPath, 'plain.txt'));
    const dstPath = path.resolve(tmpRoot, 'entry.zip');
    createStoredZip(dstPath, [{name: 'plain.txt', contents: 'PWNED\n', mode: 0o100644}]);
    await assert.rejects(
      zip.readEntries(dstPath, async ({extractEntryTo}) => {
        await extractEntryTo(outputPath);
      }),
      /existing symlink/,
    );
    assert.strictEqual(await fs.readFile(victim, 'utf8'), 'original');
  });
});
