import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {afterEach, beforeEach, describe, it} from 'node:test';

import {fs, tempDir} from '../../lib/index';
import {isWindows} from '../../lib/system';
import * as zip from '../../lib/zip';

// Builds a minimal stored (uncompressed) ZIP archive with explicit unix modes,
// so symlink entries can be embedded without relying on external zip tooling.
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

function header(sig: number, fields: [number, number, number][], extraTail: [number, number, number][] = []): Buffer {
  const size = 46;
  const buf = Buffer.alloc(size);
  for (const [offset, value, length] of fields) {
    if (length === 4) {
      buf.writeUInt32LE(value, offset);
    } else {
      buf.writeUInt16LE(value, offset);
    }
  }
  for (const [offset, value, length] of extraTail) {
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

describe('extractAllTo(useSystemUnzip) symlink containment', function () {
  let tmpRoot: string;
  let outputPath: string;

  beforeEach(async function () {
    tmpRoot = await tempDir.openDir();
    outputPath = path.resolve(tmpRoot, 'output');
  });

  afterEach(async function () {
    try {
      await fs.rimraf(tmpRoot);
    } catch {
      // windows file-handle flakiness
    }
  });

  it('should reject an escaping symlink even with useSystemUnzip', {skip: isWindows()}, async function () {
    const escapePath = path.resolve(tmpRoot, 'escape');
    await fs.mkdir(escapePath);
    const dstPath = path.resolve(tmpRoot, 'symlink.zip');
    createStoredZip(dstPath, [
      {name: 'pwn', contents: escapePath, mode: 0o120777},
      {name: 'pwn/owned.txt', contents: 'PWNED\n', mode: 0o100644},
    ]);
    await assert.rejects(zip.extractAllTo(dstPath, outputPath, {useSystemUnzip: true}), /Out of bound/);
    assert.strictEqual(await fs.exists(path.resolve(escapePath, 'owned.txt')), false);
  });

  it(
    'should still use the system unzip path for archives without symlink entries',
    {skip: isWindows()},
    async function () {
      const dstPath = path.resolve(tmpRoot, 'plain.zip');
      createStoredZip(dstPath, [{name: 'plain.txt', contents: 'HELLO\n', mode: 0o100644}]);
      await zip.extractAllTo(dstPath, outputPath, {useSystemUnzip: true});
      assert.strictEqual(await fs.readFile(path.resolve(outputPath, 'plain.txt'), 'utf8'), 'HELLO\n');
    },
  );
});
