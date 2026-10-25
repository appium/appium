import {once} from 'node:events';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import zlib from 'node:zlib';

import type * as yauzl from 'yauzl';

import type {ExtractFs} from './fs-like.js';
import {WriteQueue} from './write-queue.js';
import {
  createOpenReadStream,
  openZip,
  type OpenReadStreamFn,
  processYauzlEntriesSequentially,
  toEntryFileName,
} from './yauzl-helpers.js';
import {
  assertContent,
  assertSupportedEntry,
  BUFFERED_ENTRY_LIMIT,
  decodeEntry,
  EntrySink,
  INFLATE_CHUNK_SIZE,
  LOCAL_HEADER_SIZE,
  MAX_PENDING_BYTES,
  METHOD_DEFLATE,
  normalizeConcurrency,
  SIG_LOCAL,
  type SinkContext,
} from './zip-entry-sink.js';
import {isIgnoredEntry, ZipEntryWriter} from './zip-entry-writer.js';

const IFMT = 0b1111000000000000;
const IFDIR = 0b0100000000000000;
const IFLNK = 0b1010000000000000;
// Longer targets cannot be links on any supported OS
const MAX_SYMLINK_TARGET_SIZE = 64 * 1024;

export interface ZipExtractorOptions {
  dir: string;
  fileNamesEncoding?: BufferEncoding;
  concurrency?: number;
  defaultDirMode?: string;
  defaultFileMode?: string;
}

/** Extracts a ZIP file from disk. Based on https://github.com/maxogden/extract-zip/blob/master/index.js */
export class ZipExtractor {
  private zipfile!: yauzl.ZipFile;
  private readonly writer: ZipEntryWriter;
  private readonly queue: WriteQueue;
  private readonly sinkContext: SinkContext;
  private openReadStream!: OpenReadStreamFn;
  // The descriptor of the archive for reading the content of small entries
  private archiveFd = -1;
  private readonly zipPath: string;
  private readonly opts: ZipExtractorOptions;
  private readonly fs: ExtractFs;
  private canceled = false;

  constructor(sourcePath: string, opts: ZipExtractorOptions, fs: ExtractFs) {
    this.zipPath = sourcePath;
    this.opts = opts;
    this.fs = fs;
    this.writer = new ZipEntryWriter({...opts, fs});
    this.queue = new WriteQueue(normalizeConcurrency(opts.concurrency), MAX_PENDING_BYTES);
    this.sinkContext = {writer: this.writer, queue: this.queue};
  }

  /** Extracts all entries into the destination folder. Nothing touches it after the returned promise settles. */
  async extract(): Promise<void> {
    const {fileNamesEncoding} = this.opts;
    const zipfile = await openZip(this.zipPath, {
      lazyEntries: true,
      // https://github.com/thejoshwolfe/yauzl/commit/cc7455ac789ba84973184e5ebde0581cdc4c3b39#diff-04c6e90faac2675aa89e2176d2eec7d8R95
      decodeStrings: !fileNamesEncoding,
    });
    this.zipfile = zipfile;
    this.openReadStream = createOpenReadStream(zipfile);
    this.canceled = false;

    try {
      this.archiveFd = await this.fs.open(this.zipPath, 'r');
      await this.writer.detectNaming();
      await processYauzlEntriesSequentially(zipfile, async (entry) => {
        if (this.canceled) {
          return false;
        }
        await this.extractEntry(entry);
      });
      await this.queue.drain();
    } catch (err) {
      this.canceled = true;
      throw err;
    } finally {
      // Nothing may touch the destination after this function has returned
      await this.queue.settle();
      zipfile.close();
      await this.closeArchive();
    }
  }

  private async closeArchive(): Promise<void> {
    const fd = this.archiveFd;
    this.archiveFd = -1;
    if (fd < 0) {
      return;
    }
    try {
      await this.fs.close(fd);
    } catch {
      // nothing is written to the archive, so there is nothing to lose
    }
  }

  private extractFileName(entry: yauzl.Entry): string {
    return toEntryFileName(entry, this.opts.fileNamesEncoding);
  }

  private async extractEntry(entry: yauzl.Entry): Promise<void> {
    // A file which could not be written makes the rest of the work pointless
    this.queue.throwIfFailed();
    const fileName = this.extractFileName(entry);
    // convert external file attr int into a fs stat mode int
    const mode = (entry.externalFileAttributes >> 16) & 0xffff;
    // check if it's a symlink or dir (using stat mode constants)
    const isSymlink = (mode & IFMT) === IFLNK;
    const isDir =
      (mode & IFMT) === IFDIR ||
      // Failsafe, borrowed from jsZip
      fileName.endsWith('/') ||
      // check for windows weird way of specifying a directory
      // https://github.com/maxogden/extract-zip/issues/13#issuecomment-154494566
      (entry.versionMadeBy >> 8 === 0 && entry.externalFileAttributes === 16);
    if (isDir || isIgnoredEntry(fileName)) {
      // Folders must not overlap with the files being written
      await this.queue.waitForKey(this.writer.pathKey(fileName));
      await this.writer.write({fileName, mode, isDir, isSymlink, openBody: () => this.openReadStream(entry)});
      return;
    }
    if (isSymlink) {
      await this.extractSymlink(entry, fileName, mode);
      return;
    }

    assertSupportedEntry(fileName, entry.generalPurposeBitFlag, entry.compressionMethod);
    const prepared = await this.writer.prepareFile(fileName, mode);
    const sink = new EntrySink(this.sinkContext, {created: false}, prepared, entry.uncompressedSize);
    const expected = {crc: entry.crc32, size: entry.uncompressedSize};
    try {
      if (entry.uncompressedSize <= BUFFERED_ENTRY_LIMIT && entry.compressedSize <= BUFFERED_ENTRY_LIMIT) {
        const data = await readEntryData(this.fs, this.archiveFd, entry);
        // The entry ends where the central directory says, whatever follows the deflate stream
        await sink.finishCompressed(fileName, entry.compressionMethod, data, expected, true);
      } else {
        await this.streamEntry(entry, sink);
        assertContent(fileName, sink, expected);
        await sink.finish();
      }
    } catch (err) {
      await sink.abort();
      throw err;
    }
  }

  private async extractSymlink(entry: yauzl.Entry, fileName: string, mode: number): Promise<void> {
    assertSupportedEntry(fileName, entry.generalPurposeBitFlag, entry.compressionMethod);
    if (entry.uncompressedSize > MAX_SYMLINK_TARGET_SIZE || entry.compressedSize > MAX_SYMLINK_TARGET_SIZE) {
      throw new Error(`The symlink target of the ZIP entry '${fileName}' is too large`);
    }
    // The target is verified like the content of any other entry
    const data = await readEntryData(this.fs, this.archiveFd, entry);
    // The entry ends where the central directory says, whatever follows the deflate stream
    const target = await decodeEntry(
      fileName,
      entry.compressionMethod,
      data,
      {crc: entry.crc32, size: entry.uncompressedSize},
      true,
    );
    // Links must not overlap with the files being written
    await this.queue.drain();
    await this.writer.write({
      fileName,
      mode,
      isDir: false,
      isSymlink: true,
      openBody: async () => Readable.from([target]),
    });
  }

  private async streamEntry(entry: yauzl.Entry, sink: EntrySink): Promise<void> {
    const deflated = entry.compressionMethod === METHOD_DEFLATE;
    // Inflating here instead of in yauzl allows bigger chunks
    const raw = await this.openReadStream(entry, deflated ? {decompress: false} : undefined);
    // Older Node.js versions report an abort instead of the error which made the pipeline stop
    let sinkError: unknown;
    let pushing: Promise<void> = Promise.resolve();
    const consume = async (source: AsyncIterable<Buffer>) => {
      for await (const chunk of source) {
        try {
          pushing = sink.push(chunk);
          await pushing;
        } catch (err) {
          sinkError = err;
          throw err;
        }
      }
    };
    let results: PromiseSettledResult<void>[];
    if (deflated) {
      const inflater = zlib.createInflateRaw({chunkSize: INFLATE_CHUNK_SIZE});
      results = await Promise.allSettled([feedInflater(raw, inflater), pipeline(inflater, consume)]);
    } else {
      results = await Promise.allSettled([pipeline(raw, consume)]);
    }
    // The sink is aborted by the caller, so its last write must not be in flight anymore
    await pushing.catch(() => {});
    const failed = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (failed) {
      throw sinkError ?? failed.reason;
    }
  }
}

/** Unlike `pipeline`, reads the raw stream up to its end, so padding after the deflate stream is tolerated */
async function feedInflater(raw: Readable, inflater: zlib.InflateRaw): Promise<void> {
  // A single listener for all waits
  const closed = (async () => {
    try {
      await once(inflater, 'close');
    } catch {
      // the failure is reported by the inflater pipeline
    }
  })();
  try {
    for await (const chunk of raw) {
      if (inflater.destroyed) {
        return;
      }
      if (!inflater.write(chunk)) {
        await Promise.race([once(inflater, 'drain'), closed]);
      }
    }
    inflater.end();
  } catch (err) {
    inflater.destroy(err as Error);
    throw err;
  } finally {
    raw.destroy();
  }
}

/**
 * Reads the stored or compressed content of an entry with as few reads as possible.
 *
 * @throws {Error} If the local header does not belong to the entry or the archive is truncated
 */
async function readEntryData(fs: ExtractFs, archiveFd: number, entry: yauzl.Entry): Promise<Buffer> {
  const position = entry.relativeOffsetOfLocalHeader;
  // The local header usually has the same name and extra field as the central one
  let buffer = Buffer.allocUnsafe(
    LOCAL_HEADER_SIZE + entry.fileNameLength + entry.extraFieldLength + entry.compressedSize,
  );
  let length = await readFully(fs, archiveFd, buffer, position);
  if (length < LOCAL_HEADER_SIZE || buffer.readUInt32LE(0) !== SIG_LOCAL) {
    throw new Error(`Invalid local file header of the ZIP entry at offset ${position}`);
  }
  const start = LOCAL_HEADER_SIZE + buffer.readUInt16LE(26) + buffer.readUInt16LE(28);
  const end = start + entry.compressedSize;
  if (end > buffer.length) {
    buffer = Buffer.allocUnsafe(end);
    length = await readFully(fs, archiveFd, buffer, position);
  }
  if (length < end) {
    throw new Error(`Truncated ZIP archive: the data of the entry at offset ${position} is incomplete`);
  }
  return buffer.subarray(start, end);
}

async function readFully(fs: ExtractFs, fd: number, buffer: Buffer, position: number): Promise<number> {
  let length = 0;
  while (length < buffer.length) {
    const {bytesRead} = await fs.read(fd, buffer, length, buffer.length - length, position + length);
    if (!bytesRead) {
      break;
    }
    length += bytesRead;
  }
  return length;
}
