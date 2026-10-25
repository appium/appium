import {createWriteStream} from 'node:fs';
import path from 'node:path';
import stream from 'node:stream';
import {pipeline} from 'node:stream/promises';

// @ts-ignore - archiver 8.0 types are not available; 7.x types don't match
import {ZipArchive} from 'archiver';
import type * as yauzl from 'yauzl';

import {fs} from './fs.js';
import {
  createBase64EncodeStream,
  createOpenReadStream,
  extractZipStream,
  openZip,
  type OpenReadStreamFn,
  processYauzlEntriesSequentially,
  toEntryFileName,
  ZipEntryWriter,
  ZipExtractor,
  type ZipExtractorOptions,
} from './internal/index.js';

export {ZipStreamUnsupportedError} from './internal/index.js';
import log from './logger.js';
import {Timer} from './timing.js';
import {GiB, isSubPath, toReadableSizeString} from './util.js';

const ZIP_MAGIC = 'PK';

export interface ExtractAllOptions {
  /**
   * The encoding of file names that are not flagged as UTF-8 by the archive.
   * It is `utf8` by default, which is what ZIP archives created on MacOS usually contain.
   * Only needs to be set if the archive does not comply to the standards, which leads to
   * corrupted file names after extraction.
   */
  fileNamesEncoding?: BufferEncoding;
  /**
   * The number of files written to the disk at the same time (4 by default, at most 64).
   * Folders, big entries and links are always processed one by one.
   */
  concurrency?: number;
}

export interface ExtractStreamOptions {
  /**
   * The encoding of file names that are not flagged as UTF-8 by the archive.
   * It is `utf8` by default, which is what ZIP archives created on MacOS usually contain.
   */
  fileNamesEncoding?: BufferEncoding;
  /**
   * The number of files written to the disk at the same time (4 by default, at most 64).
   * Folders, big entries and links are always processed one by one.
   */
  concurrency?: number;
}

export interface ZipEntry {
  /** The actual entry instance */
  entry: yauzl.Entry;
  /**
   * Async function which accepts the destination folder path
   * and extracts this entry into it.
   */
  extractEntryTo: (destDir: string) => Promise<void>;
}

export interface ZipOptions {
  /** Whether to encode the resulting archive to a base64-encoded string */
  encodeToBase64?: boolean;
  /** Whether to log the actual archiver performance */
  isMetered?: boolean;
  /**
   * The maximum size of the resulting archive in bytes.
   * This is set to 1GB by default, because Appium limits the maximum HTTP body size to 1GB.
   * Also, the NodeJS heap size must be enough to keep the resulting object
   * (usually this size is limited to 1.4 GB)
   */
  maxSize?: number;
  /**
   * The compression level.
   * The maximum level is 9 (the best compression, worst performance).
   * The minimum compression level is 0 (no compression).
   */
  level?: number;
}

export interface ZipCompressionOptions {
  /**
   * Compression level in range 0..9
   * (greater numbers mean better compression, but longer processing time)
   */
  level?: number;
}

export interface ZipSourceOptions {
  /** GLOB pattern for compression */
  pattern?: string;
  /** The source root folder (the parent folder of the destination file by default) */
  cwd?: string;
  /** The list of ignored patterns */
  ignore?: string[];
}

/**
 * Extract a ZIP archive from a stream (for example, a HTTP response) to a directory
 * while it is being received. Only stored and deflate entries are supported.
 * The same safety checks as in {@linkcode extractAllTo} apply.
 *
 * Entries are read from the local file headers like `bsdtar` does it. Permissions and symlinks,
 * which only exist in the central directory at the end of the archive, are applied after
 * all entries are written. The source is consumed completely and destroyed on failure.
 *
 * @param source The archive bytes
 * @param destDir The full path to the destination folder
 * @param opts Extraction options
 * @returns The total number of bytes read from the source
 * @throws {ZipStreamUnsupportedError} If the archive uses encryption or other compression methods
 * @throws {Error} If the source is not a valid or complete ZIP archive, or an entry is not safe to extract
 */
export async function extractStreamTo(
  source: stream.Readable | AsyncIterable<Uint8Array>,
  destDir: string,
  opts: ExtractStreamOptions = {},
): Promise<{archiveSize: number}> {
  try {
    if (!path.isAbsolute(destDir)) {
      throw new Error(`Target path '${destDir}' is expected to be absolute`);
    }
    await fs.mkdir(destDir, {recursive: true});
    const dir = await fs.realpath(destDir);
    return await extractZipStream(source, new ZipEntryWriter({dir, fs}), {...opts, log});
  } catch (err) {
    if (source instanceof stream.Readable) {
      source.destroy();
    }
    throw err;
  }
}

/**
 * Extract zipfile to a directory.
 *
 * Only stored and deflate entries are supported, and the CRC32 of every one of them is verified.
 * Resource-fork (`__MACOSX/`) and nameless entries are skipped. The same safety checks as in
 * {@linkcode extractStreamTo} apply.
 *
 * @param zipFilePath The full path to the source ZIP file
 * @param destDir The full path to the destination folder
 * @param opts Extraction options
 * @throws {ZipStreamUnsupportedError} If an entry is encrypted or uses another compression method
 * @throws {Error} If the archive is not valid, an entry is corrupted or not safe to extract
 */
export async function extractAllTo(zipFilePath: string, destDir: string, opts: ExtractAllOptions = {}): Promise<void> {
  if (!path.isAbsolute(destDir)) {
    throw new Error(`Target path '${destDir}' is expected to be absolute`);
  }

  await fs.mkdir(destDir, {recursive: true});
  const dir = await fs.realpath(destDir);
  const extractor = new ZipExtractor(
    zipFilePath,
    {...(opts as ExtractAllOptions & Partial<ZipExtractorOptions>), dir},
    fs,
  );
  await extractor.extract();
}

/**
 * Extract a single zip entry to a directory
 *
 * @private
 * @param zipFile The source ZIP stream
 * @param entry The entry instance
 * @param destDir The full path to the destination folder
 * @param openReadStream Reused bound opener (one per archive)
 */
export async function _extractEntryTo(
  zipFile: yauzl.ZipFile,
  entry: yauzl.Entry,
  destDir: string,
  openReadStream: OpenReadStreamFn = createOpenReadStream(zipFile),
): Promise<void> {
  const fileName = toEntryFileName(entry);
  const dstPath = path.resolve(destDir, fileName);
  if (!isSubPath(dstPath, destDir)) {
    throw new Error(`Out of bound path "${dstPath}" found while processing file ${fileName}`);
  }

  if (fileName.endsWith('/')) {
    if (!(await fs.exists(dstPath))) {
      await fs.mkdirp(dstPath);
    }
    return;
  }
  await fs.mkdirp(path.dirname(dstPath));

  const readStream = await openReadStream(entry);
  await pipeline(readStream, createWriteStream(dstPath, {flags: 'w'}));
}

/**
 * Get entries for a zip folder
 *
 * @param zipFilePath The full path to the source ZIP file
 * @param onEntry Callback when entry is read.
 * The callback is expected to accept one argument of ZipEntry type.
 * The iteration through the source zip file will be terminated as soon as
 * the result of this function equals to `false`.
 */
export async function readEntries(
  zipFilePath: string,
  onEntry: (entry: ZipEntry) => boolean | void | Promise<boolean | void>,
): Promise<void> {
  const zipfile = await openZip(zipFilePath, {lazyEntries: true});
  const openReadStream = createOpenReadStream(zipfile);

  await processYauzlEntriesSequentially(zipfile, async (entry) => {
    const res = await onEntry({
      entry,
      extractEntryTo: async (destDir: string) => await _extractEntryTo(zipfile, entry, destDir, openReadStream),
    });
    return res === false ? false : undefined;
  });
}

/**
 * Converts contents of local directory to an in-memory .zip buffer
 *
 * @param srcPath The full path to the folder or file being zipped
 * @param opts Zipping options
 * @returns Zipped (and encoded if `encodeToBase64` is truthy)
 * content of the source path as memory buffer
 * @throws {Error} if there was an error while reading the source
 * or the source is too big
 */
export async function toInMemoryZip(srcPath: string, opts: ZipOptions = {}): Promise<Buffer> {
  if (!(await fs.exists(srcPath))) {
    throw new Error(`No such file or folder: ${srcPath}`);
  }

  const {isMetered = true, encodeToBase64 = false, maxSize = 1 * GiB, level = 9} = opts;
  const resultBuffers: Buffer[] = [];
  let resultBuffersSize = 0;
  // Create a writable stream that zip buffers will be streamed to
  const resultWriteStream = new stream.Writable({
    write(buffer: Buffer, _encoding: string, next: (err?: Error) => void) {
      resultBuffers.push(buffer);
      resultBuffersSize += buffer.length;
      if (maxSize > 0 && resultBuffersSize > maxSize) {
        resultWriteStream.emit(
          'error',
          new Error(`The size of the resulting ` + `archive must not be greater than ${toReadableSizeString(maxSize)}`),
        );
      }
      next();
    },
  });

  // Zip 'srcDir' and stream it to the above writable stream
  const archive = new ZipArchive({
    zlib: {level},
  });
  let srcSize: number | null = null;
  const base64EncoderStream = encodeToBase64 ? createBase64EncodeStream() : null;
  const resultWriteStreamPromise = new Promise<void>((resolve, reject) => {
    resultWriteStream.once('error', (e: Error) => {
      if (base64EncoderStream) {
        archive.unpipe(base64EncoderStream);
        base64EncoderStream.unpipe(resultWriteStream);
      } else {
        archive.unpipe(resultWriteStream);
      }
      archive.abort();
      archive.destroy();
      reject(e);
    });
    resultWriteStream.once('finish', () => {
      srcSize = archive.pointer();
      resolve();
    });
  });
  const archiveStreamPromise = new Promise<void>((resolve, reject) => {
    archive.once('finish', resolve);
    archive.once('error', (e: Error) => reject(new Error(`Failed to archive '${srcPath}': ${e.message}`)));
  });
  const timer = isMetered ? new Timer().start() : null;
  if ((await fs.stat(srcPath)).isDirectory()) {
    archive.directory(srcPath, false);
  } else {
    archive.file(srcPath, {
      name: path.basename(srcPath),
    });
  }
  if (base64EncoderStream) {
    archive.pipe(base64EncoderStream);
    base64EncoderStream.pipe(resultWriteStream);
  } else {
    archive.pipe(resultWriteStream);
  }

  await Promise.all([archive.finalize(), archiveStreamPromise, resultWriteStreamPromise]);

  if (timer) {
    log.debug(
      `Zipped ${encodeToBase64 ? 'and base64-encoded ' : ''}` +
        `'${path.basename(srcPath)}' ` +
        (srcSize ? `(${toReadableSizeString(srcSize)}) ` : '') +
        `in ${timer.getDuration().asSeconds.toFixed(3)}s ` +
        `(compression level: ${level})`,
    );
  }
  // Return the array of zip buffers concatenated into one buffer
  return Buffer.concat(resultBuffers);
}

/**
 * Verifies whether the given file is a valid ZIP archive
 *
 * @param filePath - Full path to the file
 * @throws {Error} If the file does not exist or is not a valid ZIP archive
 */
export async function assertValidZip(filePath: string): Promise<boolean> {
  if (!(await fs.exists(filePath))) {
    throw new Error(`The file at '${filePath}' does not exist`);
  }

  const {size} = await fs.stat(filePath);
  if (size < 4) {
    throw new Error(`The file at '${filePath}' is too small to be a ZIP archive`);
  }
  const fd = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(ZIP_MAGIC.length);
    await fs.read(fd, buffer, 0, ZIP_MAGIC.length, 0);
    const signature = buffer.toString('ascii');
    if (signature !== ZIP_MAGIC) {
      throw new Error(
        `The file signature '${signature}' of '${filePath}' ` +
          `is not equal to the expected ZIP archive signature '${ZIP_MAGIC}'`,
      );
    }
    return true;
  } finally {
    await fs.close(fd);
  }
}

/**
 * Creates an archive based on the given glob pattern
 *
 * @param dstPath - The resulting archive path
 * @param src - Source options
 * @param opts - Compression options
 * @throws {Error} If there was an error while creating the archive
 */
export async function toArchive(
  dstPath: string,
  src: ZipSourceOptions = {},
  opts: ZipCompressionOptions = {},
): Promise<void> {
  const {level = 9} = opts;
  const {pattern = '**/*', cwd = path.dirname(dstPath), ignore = []} = src;
  const archive = new ZipArchive({zlib: {level}});
  const outStream = fs.createWriteStream(dstPath);
  await new Promise<void>((resolve, reject) => {
    const outFinished = new Promise<void>((_resolve, _reject) => {
      outStream.once('error', (e: Error) => {
        archive.unpipe(outStream);
        archive.abort();
        archive.destroy();
        _reject(e);
      });
      outStream.once('finish', () => _resolve());
    });

    archive
      .glob(pattern, {
        cwd,
        ignore,
      })
      .on('error', reject)
      .pipe(outStream);

    void Promise.all([archive.finalize(), outFinished])
      .then(() => resolve())
      .catch(reject);
  });
}

export default {
  extractAllTo,
  readEntries,
  toInMemoryZip,
  assertValidZip,
  toArchive,
};
