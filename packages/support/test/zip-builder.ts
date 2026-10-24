import crypto from 'node:crypto';
import path from 'node:path';
import {Readable} from 'node:stream';
import zlib from 'node:zlib';

import {fs} from '../lib/index.js';

export type DescriptorKind = 'none' | 'signature' | 'bare';

export interface BuildEntry {
  name: string;
  data?: Buffer | string;
  /** Unix mode including file type bits, e.g. 0o100755, 0o120777 (link), 0o40755 (folder) */
  mode?: number;
  /** 0 = stored, 8 = deflate (default 8 for non-empty data); other values are written as-is */
  method?: number;
  /** Where the sizes/CRC live: local header (none) or a data descriptor after the data */
  descriptor?: DescriptorKind;
  /** Writes the local zip64 extra and a 64-bit descriptor */
  zip64?: boolean;
  /** Name written to the local header, if it must differ from the central directory name */
  localName?: string;
  /** General purpose bit flags to add (e.g. 1 = encrypted) */
  flags?: number;
  /** Extra field bytes added to the local header (after the zip64 field, if any) */
  localExtra?: Buffer;
  /** Raw bytes put right after this entry's data (and descriptor) */
  junkAfter?: Buffer;
  /** Overrides to produce corrupted archives */
  crc?: number;
  size?: number;
  compressedSize?: number;
  /** Do not mark the name as UTF-8 */
  noUtf8Flag?: boolean;
  /** Skips the central directory record of this entry */
  hideFromCentralDirectory?: boolean;
}

export interface BuildOptions {
  /** Inserts an APK Signing Block before the central directory */
  signingBlock?: boolean;
  /** Bytes between the last entry and the central directory (before the signing block) */
  junkBeforeCentralDirectory?: Buffer;
  comment?: string;
  /** Host system in "version made by" (3 = Unix, default) */
  hostSystem?: number;
}

/** Builds a ZIP archive byte by byte, so that unusual layouts can be tested. */
export function buildZip(entries: BuildEntry[], opts: BuildOptions = {}): Buffer {
  const body: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  const push = (chunk: Buffer) => {
    body.push(chunk);
    offset += chunk.length;
  };

  for (const entry of entries) {
    const data = Buffer.from(entry.data ?? '');
    const method = entry.method ?? (data.length ? 8 : 0);
    const stored = method === 8 ? zlib.deflateRawSync(data) : data;
    const crc = entry.crc ?? zlib.crc32(data);
    const size = entry.size ?? data.length;
    const compressedSize = entry.compressedSize ?? stored.length;
    const descriptor = entry.descriptor ?? 'none';
    const centralName = Buffer.from(entry.name);
    const localName = Buffer.from(entry.localName ?? entry.name);
    const flags = (entry.noUtf8Flag ? 0 : 0x800) | (descriptor === 'none' ? 0 : 0x8) | (entry.flags ?? 0);
    const localOffset = offset;

    const zip64Extra = entry.zip64 ? Buffer.alloc(4 + 16) : Buffer.alloc(0);
    if (entry.zip64) {
      zip64Extra.writeUInt16LE(1, 0);
      zip64Extra.writeUInt16LE(16, 2);
      if (descriptor === 'none') {
        zip64Extra.writeBigUInt64LE(BigInt(size), 4);
        zip64Extra.writeBigUInt64LE(BigInt(compressedSize), 12);
      }
    }
    const extra = Buffer.concat([zip64Extra, entry.localExtra ?? Buffer.alloc(0)]);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(entry.zip64 ? 45 : 20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    if (descriptor === 'none') {
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(entry.zip64 ? 0xffffffff : compressedSize, 18);
      local.writeUInt32LE(entry.zip64 ? 0xffffffff : size, 22);
    }
    local.writeUInt16LE(localName.length, 26);
    local.writeUInt16LE(extra.length, 28);
    push(Buffer.concat([local, localName, extra, stored]));

    if (descriptor !== 'none') {
      const width = entry.zip64 ? 8 : 4;
      const tail = Buffer.alloc((descriptor === 'signature' ? 4 : 0) + 4 + 2 * width);
      let pos = 0;
      if (descriptor === 'signature') {
        tail.writeUInt32LE(0x08074b50, pos);
        pos += 4;
      }
      tail.writeUInt32LE(crc, pos);
      pos += 4;
      if (entry.zip64) {
        tail.writeBigUInt64LE(BigInt(compressedSize), pos);
        tail.writeBigUInt64LE(BigInt(size), pos + 8);
      } else {
        tail.writeUInt32LE(compressedSize, pos);
        tail.writeUInt32LE(size, pos + 4);
      }
      push(tail);
    }
    if (entry.junkAfter) {
      push(entry.junkAfter);
    }

    if (entry.hideFromCentralDirectory) {
      continue;
    }
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(((opts.hostSystem ?? 3) << 8) | 20, 4);
    record.writeUInt16LE(20, 6);
    record.writeUInt16LE(flags, 8);
    record.writeUInt16LE(method, 10);
    record.writeUInt32LE(crc, 16);
    record.writeUInt32LE(compressedSize, 20);
    record.writeUInt32LE(size, 24);
    record.writeUInt16LE(centralName.length, 28);
    record.writeUInt32LE(((entry.mode ?? 0) & 0xffff) * 0x10000, 38);
    record.writeUInt32LE(localOffset, 42);
    central.push(record, centralName);
  }

  if (opts.junkBeforeCentralDirectory) {
    push(opts.junkBeforeCentralDirectory);
  }
  if (opts.signingBlock) {
    const pairs = crypto.randomBytes(300);
    const size = Buffer.alloc(8);
    size.writeBigUInt64LE(BigInt(pairs.length + 8 + 16));
    push(Buffer.concat([size, pairs, size, Buffer.from('APK Sig Block 42')]));
  }

  const centralData = Buffer.concat(central);
  const comment = Buffer.from(opts.comment ?? '');
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(central.length / 2, 8);
  eocd.writeUInt16LE(central.length / 2, 10);
  eocd.writeUInt32LE(centralData.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(comment.length, 20);
  return Buffer.concat([...body, centralData, eocd, comment]);
}

/** Emits the buffer in chunks of the given sizes (cycled) */
export function chunked(data: Buffer, sizes: number[] | ((index: number) => number)): Readable {
  const next = typeof sizes === 'function' ? sizes : (i: number) => sizes[i % sizes.length];
  return Readable.from(
    (function* () {
      for (let offset = 0, index = 0; offset < data.length; index++) {
        const length = Math.max(1, next(index));
        yield data.subarray(offset, offset + length);
        offset += length;
      }
    })(),
  );
}

/** Describes a directory tree (types, names, content hashes, modes, link targets) as sorted lines. */
export async function snapshot(root: string, opts: {modes?: boolean} = {}): Promise<string[]> {
  const lines: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    for (const name of (await fs.readdir(dir)).sort()) {
      const full = path.join(dir, name);
      const rel = path.relative(root, full);
      const stats = await fs.lstat(full);
      if (stats.isSymbolicLink()) {
        lines.push(`L ${rel} -> ${await fs.readlink(full)}`);
      } else if (stats.isDirectory()) {
        lines.push(`D ${rel}`);
        await walk(full);
      } else {
        const hash = crypto
          .createHash('sha1')
          .update(await fs.readFile(full))
          .digest('hex');
        const mode = opts.modes ? ` ${(stats.mode & 0o777).toString(8)}` : '';
        lines.push(`F ${rel} ${stats.size}${mode} ${hash}`);
      }
    }
  };
  await walk(root);
  return lines;
}
