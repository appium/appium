import {promisify} from 'node:util';
import zlib from 'node:zlib';

import {MiB} from './units.js';
import type {WriteQueue} from './write-queue.js';
import type {PreparedFile, ReplacementFile, ZipEntryWriter} from './zip-entry-writer.js';

export const METHOD_STORED = 0;
export const METHOD_DEFLATE = 8;
export const SIG_LOCAL = 0x04034b50;
export const LOCAL_HEADER_SIZE = 30;
export const FLAG_ENCRYPTED = 0x1;
export const FLAG_STRONG_ENCRYPTION = 0x40;
// Entries up to this size are held in memory and written concurrently, bigger ones are streamed
export const BUFFERED_ENTRY_LIMIT = 4 * MiB;
// The maximum total size of the entries waiting for their turn to be written
export const MAX_PENDING_BYTES = 32 * MiB;
export const DEFAULT_CONCURRENCY = 4;
const MAX_CONCURRENCY = 64;
export const INFLATE_CHUNK_SIZE = 64 * 1024;

const METHOD_NAMES: Readonly<Record<number, string>> = {
  1: 'shrink',
  6: 'implode',
  9: 'deflate64',
  12: 'bzip2',
  14: 'lzma',
  93: 'zstd',
  95: 'xz',
  98: 'ppmd',
  99: 'aes-encrypted',
};

const inflateRaw = promisify(zlib.inflateRaw) as unknown as (
  data: Buffer,
  options: zlib.ZlibOptions & {info: true},
) => Promise<{buffer: Buffer; engine: zlib.InflateRaw}>;

/** Thrown for valid archives using features the extractors do not implement. */
export class ZipStreamUnsupportedError extends Error {
  /** @param message What is not supported */
  constructor(message: string) {
    super(message);
    this.name = 'ZipStreamUnsupportedError';
  }
}

/** The entry data that is verified once the whole content is known */
export interface ExpectedContent {
  crc: number;
  size: number;
}

/** The part of the archive context that entries are written with */
export interface SinkContext {
  writer: ZipEntryWriter;
  queue: WriteQueue;
}

/** What an entry reports back after its file is created */
export interface CreatedFlag {
  /** False if an existing file was overwritten, so its permissions are not the default ones */
  created: boolean;
}

/**
 * @throws {ZipStreamUnsupportedError} If the entry is encrypted or uses a compression method other than stored/deflate
 */
export function assertSupportedEntry(fileName: string, flags: number, method: number): void {
  if (flags & (FLAG_ENCRYPTED | FLAG_STRONG_ENCRYPTION)) {
    throw new ZipStreamUnsupportedError(`The ZIP entry '${fileName}' is encrypted`);
  }
  if (method !== METHOD_STORED && method !== METHOD_DEFLATE) {
    const methodName = METHOD_NAMES[method] ? `${METHOD_NAMES[method]} (${method})` : String(method);
    throw new ZipStreamUnsupportedError(
      `The ZIP entry '${fileName}' uses the unsupported compression method ${methodName}. ` +
        `Only stored and deflate are supported`,
    );
  }
}

/** @throws {Error} If the content does not match what the archive declares */
export function assertContent(fileName: string, actual: ExpectedContent, expected: ExpectedContent): void {
  if (actual.size !== expected.size) {
    throw new Error(`The ZIP entry '${fileName}' has ${actual.size} bytes, but ${expected.size} bytes were expected`);
  }
  if (actual.crc !== expected.crc) {
    throw new Error(`The ZIP entry '${fileName}' is corrupted: CRC32 mismatch`);
  }
}

/**
 * Inflates (if needed) and verifies the whole content of an entry.
 *
 * @param allowTrailingData Accept bytes after the end of the deflate stream (the caller knows where the entry ends)
 * @throws {Error} If the content is corrupted or does not match what the archive declares
 */
export async function decodeEntry(
  fileName: string,
  method: number,
  data: Buffer,
  expected: ExpectedContent,
  allowTrailingData = false,
): Promise<Buffer> {
  const content =
    method === METHOD_DEFLATE ? await inflateRawEntry(fileName, data, expected.size, allowTrailingData) : data;
  assertContent(fileName, {size: content.length, crc: zlib.crc32(content)}, expected);
  return content;
}

/** The number of files to write at the same time: the default one for missing and invalid values, a sane count otherwise */
export function normalizeConcurrency(value?: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return value === Infinity ? MAX_CONCURRENCY : DEFAULT_CONCURRENCY;
  }
  return Math.min(Math.max(Math.floor(value), 1), MAX_CONCURRENCY);
}

/**
 * Collects the content of an entry. Small entries are written by the queue after they are complete (and
 * verified); big or still growing ones are streamed to the file.
 */
export class EntrySink {
  crc = 0;
  size = 0;
  private readonly context: SinkContext;
  private readonly entry: CreatedFlag;
  private readonly prepared: PreparedFile | null;
  private readonly knownSize: number | null;
  private readonly key: string;
  private chunks: Buffer[] = [];
  private buffered = 0;
  private target: ReplacementFile | null = null;

  /**
   * @param context The archive being extracted
   * @param entry The entry to update after the file is created
   * @param prepared The file to write, or null if the content is only verified
   * @param knownSize The declared size of the content, if the local header has one
   */
  constructor(context: SinkContext, entry: CreatedFlag, prepared: PreparedFile | null, knownSize: number | null) {
    this.context = context;
    this.entry = entry;
    this.prepared = prepared;
    this.knownSize = knownSize;
    this.key = prepared ? context.writer.fileKey(prepared) : '';
  }

  /**
   * Takes the next piece of the content, which is verified and either kept in memory or streamed to the file.
   *
   * @throws {Error} If the content is bigger than the declared size
   */
  async push(chunk: Buffer): Promise<void> {
    this.size += chunk.length;
    if (this.knownSize !== null && this.size > this.knownSize) {
      throw new Error(`The entry is larger than the declared size of ${this.knownSize} bytes`);
    }
    this.crc = zlib.crc32(chunk, this.crc);
    if (!this.prepared) {
      return;
    }
    if (this.target) {
      await this.target.file.writeFile(chunk);
      return;
    }
    this.chunks.push(chunk);
    this.buffered += chunk.length;
    if (this.buffered > BUFFERED_ENTRY_LIMIT || (this.knownSize ?? 0) > BUFFERED_ENTRY_LIMIT) {
      await this.spill(this.prepared);
    }
  }

  /** Completes an entry whose content is verified: the file is written or replaced */
  async finish(): Promise<void> {
    const {prepared} = this;
    if (!prepared) {
      return;
    }
    if (this.target) {
      const target = this.target;
      this.target = null;
      try {
        await target.file.close();
        await target.commit();
      } catch (err) {
        await target.discard();
        throw err;
      }
      return;
    }
    const data = this.chunks.length === 1 ? this.chunks[0] : Buffer.concat(this.chunks);
    this.chunks = [];
    await this.context.queue.submit(this.key, data.length, async () => await this.writeBuffered(prepared, data));
  }

  /**
   * Completes an entry whose whole compressed content is at hand. Inflating, verifying and writing
   * is left to the queue, so it overlaps with reading the next entries.
   *
   * @param allowTrailingData Accept bytes after the end of the deflate stream (the caller knows where the entry ends)
   */
  async finishCompressed(
    fileName: string,
    method: number,
    data: Buffer,
    expected: ExpectedContent,
    allowTrailingData = false,
  ): Promise<void> {
    const {prepared} = this;
    if (!prepared) {
      return;
    }
    // A deflated job holds the compressed and the expanded content at the same time
    const bytes = method === METHOD_DEFLATE ? data.length + expected.size : data.length;
    await this.context.queue.submit(this.key, bytes, async () => {
      const content = await decodeEntry(fileName, method, data, expected, allowTrailingData);
      await this.writeBuffered(prepared, content);
    });
  }

  /** Releases what an entry that failed has written */
  async abort(): Promise<void> {
    const {target} = this;
    this.target = null;
    this.chunks = [];
    try {
      await target?.file.close();
      await target?.discard();
    } catch {
      // the original failure is more useful
    }
  }

  private async writeBuffered(prepared: PreparedFile, data: Buffer): Promise<void> {
    const {file, created} = await this.context.writer.openPrepared(prepared);
    this.entry.created = created;
    try {
      await file.writeFile(data);
    } finally {
      await file.close();
    }
  }

  private async spill(prepared: PreparedFile): Promise<void> {
    const {writer, queue} = this.context;
    await queue.waitForKey(this.key);
    // Not verified yet, so it must not replace an existing file before the whole entry has been read
    const target = await writer.openForReplacement(prepared);
    this.target = target;
    this.entry.created = true;
    const chunks = this.chunks;
    this.chunks = [];
    this.buffered = 0;
    for (const chunk of chunks) {
      await target.file.writeFile(chunk);
    }
  }
}

/** Inflates a complete deflate stream, which must not exceed the declared size (or have data after its end) */
async function inflateRawEntry(
  fileName: string,
  data: Buffer,
  size: number,
  allowTrailingData: boolean,
): Promise<Buffer> {
  let result;
  try {
    result = await inflateRaw(data, {info: true, maxOutputLength: Math.max(size, 1)});
  } catch (err: any) {
    if (err.code === 'ERR_BUFFER_TOO_LARGE') {
      throw new Error(`The entry is larger than the declared size of ${size} bytes`, {cause: err});
    }
    throw err;
  }
  if (!allowTrailingData && result.engine.bytesWritten < data.length) {
    // What follows may be the next entry, which would be skipped
    throw new Error(`The ZIP entry '${fileName}' is corrupted: its compressed size is larger than its data`);
  }
  return result.buffer;
}
