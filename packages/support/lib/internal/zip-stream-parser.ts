import type {FileHandle} from 'node:fs/promises';
import {Readable, type Writable} from 'node:stream';
import zlib from 'node:zlib';

import log from '../logger.js';
import {MiB} from '../util.js';
import {WriteQueue} from './write-queue.js';
import {isIgnoredEntry, type PreparedFile, type ReplacementFile, type ZipEntryWriter} from './zip-entry-writer.js';

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;
const SIG_EOCD64 = 0x06064b50;
const SIG_DESCRIPTOR = 0x08074b50;
// Spanned/split archive markers: "PK\7\8" and "PK00"
const SIG_SPAN_MARKERS = [SIG_DESCRIPTOR, 0x30304b50];
const APK_SIGNING_BLOCK_MAGIC = 'APK Sig Block 42';
const EOCD_SIGNATURE = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
const EOCD_MIN_SIZE = 22;

const FLAG_ENCRYPTED = 0x1;
const FLAG_DESCRIPTOR = 0x8;
const FLAG_UTF8_NAME = 0x800;
const FLAG_STRONG_ENCRYPTION = 0x40;

const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;
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

const EXTRA_ZIP64 = 0x0001;
const EXTRA_UNICODE_PATH = 0x7075;

const HOST_UNIX = 3;
const HOST_OSX = 19;

// Entries up to this size are held in memory and written concurrently, bigger ones are streamed
const BUFFERED_ENTRY_LIMIT = 4 * MiB;
// The maximum total size of the entries waiting for their turn to be written
const MAX_PENDING_BYTES = 32 * MiB;
const DEFAULT_CONCURRENCY = 4;
const INFLATE_CHUNK_SIZE = 64 * 1024;
// A data descriptor with a signature and 64-bit sizes
const STORED_DESCRIPTOR_LOOKAHEAD = 24;
const MAX_CENTRAL_DIRECTORY_SIZE = 64 * MiB;
const MAX_SIGNING_BLOCK_SIZE = 64 * MiB;
// Second half of "PK\3\4", "PK\1\2", "PK\5\6" and "PK\6\6" as little-endian words
const RECORD_SIGNATURE_TAILS = new Set([0x0403, 0x0201, 0x0605, 0x0606]);

export interface ZipStreamOptions {
  /**
   * The encoding of entry names that are not flagged as UTF-8 (`utf8` by default).
   */
  fileNamesEncoding?: BufferEncoding;
  /**
   * The number of files written to the disk at the same time (4 by default).
   */
  concurrency?: number;
}

export interface ZipStreamResult {
  /** The total number of bytes consumed from the source */
  archiveSize: number;
}

/** Thrown for valid archives using features the stream extractor does not implement. */
export class ZipStreamUnsupportedError extends Error {
  /** @param message What is not supported */
  constructor(message: string) {
    super(message);
    this.name = 'ZipStreamUnsupportedError';
  }
}

/**
 * Extracts a ZIP archive from a non-seekable source using the local file headers only,
 * the same way libarchive's streaming reader does. Entries are written as they arrive
 * (stored and deflate, data descriptors, zip64). Information that only exists in the
 * central directory (permissions, symlinks) is applied after the last entry.
 *
 * @param source The archive bytes
 * @param writer Receives the entries
 * @param opts Parser options
 * @throws {Error} If the stream is not a ZIP archive, is truncated or corrupted
 * @throws {ZipStreamUnsupportedError} If the archive uses unsupported features
 */
export async function extractZipStream(
  source: AsyncIterable<Uint8Array>,
  writer: ZipEntryWriter,
  opts: ZipStreamOptions = {},
): Promise<ZipStreamResult> {
  const queue = new WriteQueue(opts.concurrency ?? DEFAULT_CONCURRENCY, MAX_PENDING_BYTES);
  // A failed write does not wait for the next bytes to arrive
  const reader = new ByteReader(source, queue.failed);
  try {
    await assertZipSignature(reader);
    await writer.detectNaming();
    const written = new Map<number, WrittenEntry>();
    // The last entry of a path wins, the earlier ones must not change what the last one has written
    const latest = new Map<string, number>();
    for (;;) {
      if (!(await reader.tryEnsure(4))) {
        throw new Error('Truncated ZIP archive: the central directory is missing');
      }
      const signature = reader.peekUInt32();
      if (signature === SIG_CENTRAL || signature === SIG_EOCD || signature === SIG_EOCD64) {
        break;
      }
      if (signature !== SIG_LOCAL) {
        if (!(await skipApkSigningBlock(reader))) {
          await skipToNextSignature(reader);
        }
        continue;
      }
      const header = await readLocalHeader(reader, opts);
      const entry = await extractEntry({reader, writer, queue}, header);
      written.set(header.offset, entry);
      latest.set(entry.key, header.offset);
    }
    const centralDirectory = await reader.readToEnd(MAX_CENTRAL_DIRECTORY_SIZE);
    await queue.drain();
    await applyCentralDirectory(centralDirectory, written, latest, writer);
    return {archiveSize: reader.bytesRead};
  } finally {
    // Nothing may touch the destination after this function has returned
    await queue.settle();
    await reader.close();
  }
}

interface WrittenEntry {
  fileName: string;
  rawName: Buffer;
  /** Entries replacing each other have the same key */
  key: string;
  isDir: boolean;
  /** False if an existing file was overwritten, so its permissions are not the default ones */
  created: boolean;
}

interface EntryContext {
  reader: ByteReader;
  writer: ZipEntryWriter;
  queue: WriteQueue;
}

interface LocalHeader {
  fileName: string;
  rawName: Buffer;
  offset: number;
  flags: number;
  method: number;
  crc: number;
  compressedSize: number;
  size: number;
  zip64: boolean;
}

/** Buffered view over an async byte source. Returned slices are valid until the next read. */
class ByteReader {
  bytesRead = 0;
  private readonly source: AsyncIterable<Uint8Array>;
  private readonly iterator: AsyncIterator<Uint8Array>;
  private buffer: Buffer = Buffer.alloc(0);
  private position = 0;
  private interruption: {error: unknown} | null = null;
  // Stops the read being awaited; one subscription to the interrupt serves all reads
  private stopWaiting: ((error: unknown) => void) | null = null;
  private done = false;
  private pendingRead = false;

  /**
   * @param source The bytes to read
   * @param interrupt Rejects when whatever waits for the next bytes should stop doing it
   */
  constructor(source: AsyncIterable<Uint8Array>, interrupt?: Promise<never>) {
    this.source = source;
    // oxlint-disable-next-line promise/prefer-await-to-then -- a single listener for the lifetime of the reader
    interrupt?.catch((reason) => {
      this.interruption = {error: reason};
      this.stopWaiting?.(reason);
    });
    this.iterator = source[Symbol.asyncIterator]();
  }

  /** Number of buffered unread bytes */
  get available(): number {
    return this.buffer.length - this.position;
  }

  /** Absolute offset of the next unread byte from the start of the archive */
  get offset(): number {
    return this.bytesRead - this.available;
  }

  /** Buffered unread bytes; do not keep the reference after the next read/consume */
  get view(): Buffer {
    return this.buffer.subarray(this.position);
  }

  /** Reads an unsigned little-endian 32-bit number from the unread bytes without consuming it */
  peekUInt32(at = 0): number {
    return this.buffer.readUInt32LE(this.position + at);
  }

  /** Takes the next `count` buffered bytes. Use `ensure` first. */
  consume(count: number): Buffer {
    const chunk = this.buffer.subarray(this.position, this.position + count);
    this.position += count;
    return chunk;
  }

  /** Returns unread bytes to the buffer (they must have been consumed from the current buffer) */
  unconsume(count: number): void {
    this.position -= count;
  }

  /** Discards buffered bytes except the last `keep` ones */
  discardAllBut(keep: number): void {
    this.position = Math.max(this.position, this.buffer.length - keep);
  }

  /**
   * Buffers at least `count` unread bytes.
   *
   * @throws {Error} If the source ends before
   */
  async ensure(count: number): Promise<void> {
    if (!(await this.tryEnsure(count))) {
      throw new Error(`Truncated ZIP archive: expected ${count} more bytes but got ${this.available}`);
    }
  }

  /** Buffers at least `count` unread bytes, returns false if the source ends before */
  async tryEnsure(count: number): Promise<boolean> {
    while (this.available < count) {
      if (!(await this.fill())) {
        return false;
      }
    }
    return true;
  }

  /** Appends the next source chunk to the unread bytes; false if the source is exhausted */
  async fill(): Promise<boolean> {
    if (this.done) {
      return false;
    }
    const next = this.iterator.next();
    this.pendingRead = true;
    // The read may outlive this call if it is interrupted
    void (async () => {
      try {
        await next;
      } catch {
        // reported to whoever awaits it
      } finally {
        this.pendingRead = false;
      }
    })();
    const {value, done} = await this.awaitRead(next);
    if (done) {
      this.done = true;
      return false;
    }
    if (typeof value === 'string' || !(value instanceof Uint8Array)) {
      throw new TypeError('The ZIP source must produce binary chunks');
    }
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    this.bytesRead += chunk.length;
    this.buffer = this.available === 0 ? chunk : Buffer.concat([this.view, chunk]);
    this.position = 0;
    return true;
  }

  /**
   * Takes everything that is left, buffered or not.
   *
   * @throws {Error} If there is more than `maxSize` bytes
   */
  async readToEnd(maxSize: number): Promise<Buffer> {
    const parts: Buffer[] = [];
    let total = 0;
    do {
      const rest = this.consume(this.available);
      total += rest.length;
      if (total > maxSize) {
        throw new Error(`The ZIP central directory is larger than ${maxSize} bytes`);
      }
      parts.push(rest);
    } while (await this.fill());
    return Buffer.concat(parts);
  }

  /**
   * Stops reading and releases the source. It does not wait for a source that is stalled in the middle of
   * a read: a stream is destroyed, which ends the read, any other source is cleaned up when the read settles.
   */
  async close(): Promise<void> {
    this.done = true;
    if (this.source instanceof Readable) {
      this.source.destroy();
    }
    // Stops (and destroys, if applicable) the source if it has not been consumed completely
    const returned = Promise.resolve(this.iterator.return?.());
    if (this.pendingRead) {
      // oxlint-disable-next-line promise/prefer-await-to-then -- not waiting, but not leaving a rejection either
      returned.catch(noop);
    } else {
      await returned;
    }
  }

  /** Waits for a read, unless the interrupt comes first. Nothing stays attached to the interrupt afterwards. */
  private async awaitRead(next: Promise<IteratorResult<Uint8Array>>): Promise<IteratorResult<Uint8Array>> {
    if (this.interruption) {
      throw this.interruption.error;
    }
    try {
      return await new Promise<IteratorResult<Uint8Array>>((resolve, reject) => {
        this.stopWaiting = reject;
        // oxlint-disable-next-line promise/prefer-await-to-then -- settles the wrapper with the read
        next.then(resolve).catch(reject);
      });
    } finally {
      this.stopWaiting = null;
    }
  }
}

async function assertZipSignature(reader: ByteReader): Promise<void> {
  if (!(await reader.tryEnsure(4))) {
    throw new Error('The input is not a ZIP archive: it is too short');
  }
  const signature = reader.peekUInt32();
  if (![SIG_LOCAL, SIG_EOCD, SIG_EOCD64, ...SIG_SPAN_MARKERS].includes(signature)) {
    throw new Error('The input is not a ZIP archive: unexpected file signature');
  }
}

async function readLocalHeader(reader: ByteReader, opts: ZipStreamOptions): Promise<LocalHeader> {
  await reader.ensure(30);
  const nameLength = reader.view.readUInt16LE(26);
  const extraLength = reader.view.readUInt16LE(28);
  await reader.ensure(30 + nameLength + extraLength);
  const offset = reader.offset;
  const fixed = reader.consume(30);
  const flags = fixed.readUInt16LE(6);
  const method = fixed.readUInt16LE(8);
  const crc = fixed.readUInt32LE(14);
  let compressedSize = fixed.readUInt32LE(18);
  let size = fixed.readUInt32LE(22);
  const rawName = Buffer.from(reader.consume(nameLength));
  const extra = reader.consume(extraLength);

  let zip64 = false;
  let unicodeName: string | null = null;
  for (let pos = 0; pos + 4 <= extra.length;) {
    const id = extra.readUInt16LE(pos);
    const length = extra.readUInt16LE(pos + 2);
    const data = extra.subarray(pos + 4, pos + 4 + length);
    pos += 4 + length;
    if (id === EXTRA_ZIP64) {
      zip64 = true;
      let cursor = 0;
      if (size === 0xffffffff && cursor + 8 <= data.length) {
        size = toSafeNumber(data.readBigUInt64LE(cursor));
        cursor += 8;
      }
      if (compressedSize === 0xffffffff && cursor + 8 <= data.length) {
        compressedSize = toSafeNumber(data.readBigUInt64LE(cursor));
      }
    } else if (id === EXTRA_UNICODE_PATH && data.length > 5 && data[0] === 1) {
      // Only valid if made for this very name
      if (data.readUInt32LE(1) === zlib.crc32(rawName)) {
        unicodeName = data.toString('utf8', 5);
      }
    }
  }

  const fileName =
    unicodeName ?? rawName.toString(flags & FLAG_UTF8_NAME ? 'utf8' : (opts.fileNamesEncoding ?? 'utf8'));
  return {fileName, rawName, offset, flags, method, crc, compressedSize, size, zip64};
}

async function extractEntry(context: EntryContext, header: LocalHeader): Promise<WrittenEntry> {
  const {reader, writer} = context;
  const {fileName, flags, method} = header;
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

  const hasDescriptor = Boolean(flags & FLAG_DESCRIPTOR);
  const isDir = fileName.endsWith('/');
  const entry: WrittenEntry = {fileName, rawName: header.rawName, key: writer.pathKey(fileName), isDir, created: false};
  const ignored = isIgnoredEntry(fileName);
  if (isDir && !ignored) {
    // Unix mode is only stored in the central directory
    await writer.write({fileName, mode: 0, isDir: true, isSymlink: false, openBody: async () => noContent()});
  }
  // The content of folders and ignored entries is still read and verified
  const prepared = isDir || ignored ? null : await writer.prepareFile(fileName);
  const sink = new EntrySink(context, entry, prepared, hasDescriptor ? null : header.size);
  try {
    if (!hasDescriptor) {
      if (method === METHOD_STORED) {
        await pumpStored(reader, sink, header.compressedSize);
      } else {
        await pumpDeflate(reader, sink, fileName, header.compressedSize);
      }
      verify(fileName, sink, header.crc, header.size);
    } else if (method === METHOD_DEFLATE) {
      const compressedSize = await pumpDeflate(reader, sink, fileName, null);
      await readDescriptor(reader, header, compressedSize, sink);
    } else {
      await pumpStoredUntilDescriptor(reader, sink);
      await readDescriptor(reader, header, sink.size, sink);
    }
    await sink.finish();
  } catch (err) {
    await sink.abort();
    throw err;
  }
  return entry;
}

function noContent(): never {
  throw new Error('Folders have no content');
}

function verify(fileName: string, sink: EntrySink, crc: number, size: number): void {
  if (sink.size !== size) {
    throw new Error(`The ZIP entry '${fileName}' has ${sink.size} bytes, but ${size} bytes were expected`);
  }
  if (sink.crc !== crc) {
    throw new Error(`The ZIP entry '${fileName}' is corrupted: CRC32 mismatch`);
  }
}

/**
 * Collects the content of an entry. Small entries are written by the queue after they are complete (and
 * verified); big or still growing ones are streamed to the file.
 */
class EntrySink {
  crc = 0;
  size = 0;
  private readonly context: EntryContext;
  private readonly entry: WrittenEntry;
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
  constructor(context: EntryContext, entry: WrittenEntry, prepared: PreparedFile | null, knownSize: number | null) {
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
      await writeFully(this.target.file, chunk);
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
    const {writer, queue} = this.context;
    await queue.submit(this.key, data.length, async () => {
      const {file, created} = await writer.openPrepared(prepared);
      this.entry.created = created;
      try {
        await writeFully(file, data);
      } finally {
        await file.close();
      }
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
      await writeFully(target.file, chunk);
    }
  }
}

async function writeFully(file: FileHandle, data: Buffer): Promise<void> {
  for (let offset = 0; offset < data.length;) {
    const {bytesWritten} = await file.write(data, offset, data.length - offset);
    offset += bytesWritten;
  }
}

/** Writes a chunk and waits until it is processed. Unlike the callback alone, it settles if the stream is destroyed meanwhile. */
function write(stream: Writable, chunk: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const closed = () => new Error('The entry stream was closed');
    if (stream.destroyed) {
      reject(stream.errored ?? closed());
      return;
    }
    const onClose = () => reject(stream.errored ?? closed());
    stream.once('close', onClose);
    // oxlint-disable-next-line promise/prefer-await-to-callbacks -- completion of a single write
    stream.write(chunk, (err) => {
      stream.off('close', onClose);
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function pumpStored(reader: ByteReader, sink: EntrySink, size: number): Promise<void> {
  for (let left = size; left > 0;) {
    await reader.ensure(1);
    const chunk = reader.consume(Math.min(left, reader.available));
    left -= chunk.length;
    await sink.push(chunk);
  }
}

/**
 * Inflates `compressedSize` bytes, or a deflate stream of unknown length. In the latter case the inflater
 * reports how many bytes it really consumed, so the bytes after the end of the stream are handed back.
 *
 * @returns The number of compressed bytes
 */
async function pumpDeflate(
  reader: ByteReader,
  sink: EntrySink,
  fileName: string,
  compressedSize: number | null,
): Promise<number> {
  const inflater = zlib.createInflateRaw({chunkSize: INFLATE_CHUNK_SIZE});
  // Failures are reported through the promises below
  inflater.on('error', noop);
  const output = (async () => {
    for await (const chunk of inflater) {
      await sink.push(chunk as Buffer);
    }
  })();
  const input = (async (): Promise<number> => {
    try {
      let consumed = 0;
      for (;;) {
        if (compressedSize !== null && consumed >= compressedSize) {
          break;
        }
        await reader.ensure(1);
        const chunk = reader.consume(Math.min(reader.available, (compressedSize ?? Infinity) - consumed));
        const before = inflater.bytesWritten;
        await write(inflater, chunk);
        const used = inflater.bytesWritten - before;
        consumed += used;
        if (used < chunk.length) {
          // The deflate stream ended inside this chunk
          if (compressedSize === null) {
            reader.unconsume(chunk.length - used);
            break;
          }
          // What follows may be the next entry, which would be skipped
          throw new Error(`The ZIP entry '${fileName}' is corrupted: its compressed size is larger than its data`);
        }
      }
      inflater.end();
      return consumed;
    } catch (err) {
      inflater.destroy(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  })();
  try {
    const [consumed] = await Promise.all([input, output]);
    return consumed;
  } catch (err) {
    // The sink may be in the middle of opening its file: let it finish, so the caller can release the file
    await output.catch(noop);
    throw err;
  }
}

/**
 * Reads stored data of unknown length: the end is the data descriptor signature
 * followed by the CRC32 of everything before it.
 */
async function pumpStoredUntilDescriptor(reader: ByteReader, sink: EntrySink): Promise<void> {
  const signature = Buffer.from([0x50, 0x4b, 0x07, 0x08]);
  for (;;) {
    const view = reader.view;
    let undecided = -1;
    // Every byte is hashed once, however many signatures the data contains
    let crc = sink.crc;
    let hashed = 0;
    for (let from = 0; ;) {
      const found = view.indexOf(signature, from);
      if (found < 0) {
        break;
      }
      if (found + STORED_DESCRIPTOR_LOOKAHEAD > view.length) {
        undecided = found; // the descriptor is not buffered completely yet
        break;
      }
      crc = zlib.crc32(view.subarray(hashed, found), crc);
      hashed = found;
      // The data before the candidate has to match the CRC and the sizes of the descriptor
      if (crc === view.readUInt32LE(found + 4) && descriptorHasSize(view, found, sink.size + found)) {
        const rest = reader.consume(found);
        if (rest.length) {
          await sink.push(rest);
        }
        return;
      }
      from = found + 1;
    }
    const flush = undecided >= 0 ? undecided : Math.max(view.length - (signature.length - 1), 0);
    if (flush > 0) {
      await sink.push(reader.consume(flush));
    }
    if (!(await reader.fill())) {
      throw new Error('Truncated ZIP archive: a stored entry has no data descriptor');
    }
  }
}

/** Whether the descriptor with a signature at the position declares this size, with 32- or 64-bit sizes */
function descriptorHasSize(view: Buffer, at: number, size: number): boolean {
  return (
    (view.readUInt32LE(at + 8) === size && view.readUInt32LE(at + 12) === size) ||
    (Number(view.readBigUInt64LE(at + 8)) === size && Number(view.readBigUInt64LE(at + 16)) === size)
  );
}

/**
 * Reads `[PK\7\8] crc compressedSize size` with either 32- or 64-bit sizes and checks it against the
 * actual data. A zip64 extra in the local header means 64-bit sizes; the layouts are
 * ambiguous for empty entries, hence the hint and the verification.
 */
async function readDescriptor(
  reader: ByteReader,
  header: LocalHeader,
  compressedSize: number,
  sink: EntrySink,
): Promise<void> {
  const {fileName} = header;
  const layouts = header.zip64 ? [8, 4] : [4, 8];
  let truncated = false;
  for (const hasSignature of [true, false]) {
    for (const sizeBytes of layouts) {
      const length = (hasSignature ? 4 : 0) + 4 + 2 * sizeBytes;
      if (!(await reader.tryEnsure(length))) {
        truncated = true;
        continue;
      }
      const view = reader.view;
      let pos = 0;
      if (hasSignature) {
        if (view.readUInt32LE(0) !== SIG_DESCRIPTOR) {
          continue;
        }
        pos = 4;
      }
      const crc = view.readUInt32LE(pos);
      const readSize = (at: number) =>
        sizeBytes === 4 ? view.readUInt32LE(at) : toSafeNumber(view.readBigUInt64LE(at));
      if (crc === sink.crc && readSize(pos + 4) === compressedSize && readSize(pos + 4 + sizeBytes) === sink.size) {
        reader.consume(length);
        return;
      }
    }
  }
  if (truncated) {
    throw new Error(`Truncated ZIP archive: the data descriptor of '${fileName}' is incomplete`);
  }
  throw new Error(
    `The ZIP entry '${fileName}' is corrupted: its data descriptor does not match the data ` +
      `(${sink.size} bytes, ${compressedSize} compressed, CRC32 ${sink.crc.toString(16)})`,
  );
}

/**
 * The APK Signing Block (v2+) sits between the last entry and the central directory:
 * `size(8) pairs size(8) "APK Sig Block 42"`.
 */
async function skipApkSigningBlock(reader: ByteReader): Promise<boolean> {
  if (!(await reader.tryEnsure(8))) {
    return false;
  }
  const size = Number(reader.view.readBigUInt64LE(0));
  // The size counts everything after the leading size field, which includes the trailing size and magic
  if (size < 24 || size > MAX_SIGNING_BLOCK_SIZE || !(await reader.tryEnsure(8 + size))) {
    return false;
  }
  const view = reader.view;
  const tail = 8 + size;
  if (
    view.toString('latin1', tail - 16, tail) !== APK_SIGNING_BLOCK_MAGIC ||
    Number(view.readBigUInt64LE(tail - 24)) !== size
  ) {
    return false;
  }
  reader.consume(tail);
  return true;
}

/** Skips bytes until something that looks like a record signature (libarchive does the same). */
async function skipToNextSignature(reader: ByteReader): Promise<void> {
  // The byte at the current position is known not to start a record
  let from = 1;
  for (;;) {
    const found = findRecordSignature(reader.view, from);
    if (found >= 0) {
      reader.consume(found);
      return;
    }
    // Keep a possibly incomplete signature
    reader.discardAllBut(3);
    if (!(await reader.fill())) {
      throw new Error('Truncated ZIP archive: no entries or central directory found after unexpected data');
    }
    from = 0;
  }
}

async function applyCentralDirectory(
  centralDirectory: Buffer,
  written: Map<number, WrittenEntry>,
  latest: Map<string, number>,
  writer: ZipEntryWriter,
): Promise<void> {
  const symlinks: string[] = [];
  const modes: Array<{fileName: string; mode: number; isDir: boolean}> = [];
  let pos = 0;
  while (pos + 46 <= centralDirectory.length && centralDirectory.readUInt32LE(pos) === SIG_CENTRAL) {
    const record = centralDirectory.subarray(pos);
    const hostSystem = record.readUInt16LE(4) >> 8;
    const compressedSize = record.readUInt32LE(20);
    const size = record.readUInt32LE(24);
    const nameLength = record.readUInt16LE(28);
    const extraLength = record.readUInt16LE(30);
    const commentLength = record.readUInt16LE(32);
    const mode = record.readUInt32LE(38) >>> 16;
    let offset = record.readUInt32LE(42);
    pos += 46 + nameLength + extraLength + commentLength;
    if (pos > centralDirectory.length) {
      break;
    }
    const rawName = record.subarray(46, 46 + nameLength);
    const extra = record.subarray(46 + nameLength, 46 + nameLength + extraLength);
    if (offset === 0xffffffff) {
      offset = readZip64Offset(extra, size === 0xffffffff, compressedSize === 0xffffffff);
    }

    const entry = written.get(offset);
    if ((hostSystem !== HOST_UNIX && hostSystem !== HOST_OSX) || !mode) {
      continue;
    }
    const isSymlink = (mode & 0o170000) === 0o120000;
    if (!entry) {
      if (isSymlink) {
        log.warn(`The central directory has a symlink '${rawName.toString()}' without a matching entry; ignoring`);
      }
      continue;
    }
    if (latest.get(entry.key) !== offset) {
      continue;
    }
    if (!entry.rawName.equals(rawName)) {
      const report = isSymlink ? log.warn : log.debug;
      report.call(log, `The central directory name does not match the local header of '${entry.fileName}'; ignoring`);
      continue;
    }
    if (isSymlink) {
      symlinks.push(entry.fileName);
    } else if (entry.isDir || !entry.created || !writer.isDefaultFileMode(mode)) {
      modes.push({fileName: entry.fileName, mode, isDir: entry.isDir});
    }
  }

  // A truncated download can end inside the central directory; do not apply a partial result
  const eocdAt = centralDirectory.indexOf(EOCD_SIGNATURE, Math.min(pos, centralDirectory.length));
  if (
    eocdAt < 0 ||
    centralDirectory.length - eocdAt < EOCD_MIN_SIZE ||
    centralDirectory.length - eocdAt < EOCD_MIN_SIZE + centralDirectory.readUInt16LE(eocdAt + 20)
  ) {
    throw new Error('Truncated ZIP archive: the end of central directory record is missing');
  }

  // Links first: tightened folder permissions must not block creating them
  await writer.convertToSymlinks(symlinks);
  // Files first, then folders from the deepest one: a folder that is no longer accessible hides its content
  for (const {fileName, mode} of modes.filter(({isDir}) => !isDir)) {
    await writer.applyMode(fileName, mode);
  }
  const depth = (fileName: string) => fileName.split('/').filter(Boolean).length;
  for (const {fileName, mode} of modes
    .filter(({isDir}) => isDir)
    .sort((a, b) => depth(b.fileName) - depth(a.fileName))) {
    await writer.applyMode(fileName, mode);
  }
}

function readZip64Offset(extra: Buffer, hasSize: boolean, hasCompressedSize: boolean): number {
  for (let pos = 0; pos + 4 <= extra.length;) {
    const id = extra.readUInt16LE(pos);
    const length = extra.readUInt16LE(pos + 2);
    if (id === EXTRA_ZIP64) {
      const cursor = pos + 4 + (hasSize ? 8 : 0) + (hasCompressedSize ? 8 : 0);
      if (cursor + 8 <= pos + 4 + length) {
        return toSafeNumber(extra.readBigUInt64LE(cursor));
      }
    }
    pos += 4 + length;
  }
  return -1;
}

function toSafeNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`The ZIP entry size ${value} is too large`);
  }
  return Number(value);
}

function findRecordSignature(buffer: Buffer, from: number): number {
  for (let at = buffer.indexOf(0x50, from); at >= 0 && at + 4 <= buffer.length; at = buffer.indexOf(0x50, at + 1)) {
    if (buffer[at + 1] === 0x4b && RECORD_SIGNATURE_TAILS.has(buffer.readUInt16LE(at + 2))) {
      return at;
    }
  }
  return -1;
}

function noop(): void {}
