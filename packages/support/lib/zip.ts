import _ from 'lodash';
import {promisify} from 'node:util';
import * as yauzl from 'yauzl';
import archiver from 'archiver';
import {createWriteStream} from 'node:fs';
import path from 'node:path';
import stream from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {fs} from './fs';
import {isWindows} from './system';
import {Base64Encode} from 'base64-stream';
import {toReadableSizeString, GiB} from './util';
import {Timer} from './timing';
import log from './logger';
import getStream from 'get-stream';
import {exec} from 'teen_process';

const openZip = promisify(yauzl.open) as (
  zipPath: string,
  options?: yauzl.Options
) => Promise<yauzl.ZipFile>;

const ZIP_MAGIC = 'PK';
const IFMT = 0b1111000000000000;
const IFDIR = 0b0100000000000000;
const IFLNK = 0b1010000000000000;

// Internal extraction helpers are defined near the end of the file.

export interface ExtractAllOptions {
  /**
   * The encoding to use for extracted file names.
   * For ZIP archives created on MacOS it is usually expected to be `utf8`.
   * By default it is autodetected based on the entry metadata and is only needed to be set explicitly
   * if the particular archive does not comply to the standards, which leads to corrupted file names
   * after extraction. Only applicable if system unzip binary is NOT being used.
   */
  fileNamesEncoding?: BufferEncoding;
  /**
   * If true, attempt to use system unzip; if this fails,
   * fallback to the JS unzip implementation.
   */
  useSystemUnzip?: boolean;
}

/**
 * Extract zipfile to a directory
 *
 * @param zipFilePath The full path to the source ZIP file
 * @param destDir The full path to the destination folder
 * @param opts Extraction options
 */
export async function extractAllTo(
  zipFilePath: string,
  destDir: string,
  opts: ExtractAllOptions = {}
): Promise<void> {
  if (!path.isAbsolute(destDir)) {
    throw new Error(`Target path '${destDir}' is expected to be absolute`);
  }

  await fs.mkdir(destDir, {recursive: true});
  const dir = await fs.realpath(destDir);
  if (opts.useSystemUnzip) {
    try {
      await extractWithSystemUnzip(zipFilePath, dir);
      return;
    } catch (err: any) {
      log.warn('unzip failed; falling back to JS: %s', err.stderr || err.message);
    }
  }
  const extractor = new ZipExtractor(zipFilePath, {
    ...(opts as ExtractAllOptions & Partial<ZipExtractorOptions>),
    dir,
  });
  await extractor.extract();
}

/**
 * Extract a single zip entry to a directory
 *
 * @private
 * @param zipFile The source ZIP stream
 * @param entry The entry instance
 * @param destDir The full path to the destination folder
 */
export async function _extractEntryTo(
  zipFile: yauzl.ZipFile,
  entry: yauzl.Entry,
  destDir: string
): Promise<void> {
  const dstPath = path.resolve(destDir, entry.fileName);

  // Create dest directory if doesn't exist already
  if (entry.fileName.endsWith('/')) {
    if (!(await fs.exists(dstPath))) {
      await fs.mkdirp(dstPath);
    }
    return;
  } else if (!(await fs.exists(path.dirname(dstPath)))) {
    await fs.mkdirp(path.dirname(dstPath));
  }

  // Create a write stream
  const writeStream = createWriteStream(dstPath, {flags: 'w'});
  const writeStreamPromise = new Promise<void>((resolve, reject) => {
    writeStream.once('finish', resolve);
    writeStream.once('error', reject);
  });

  const openReadStream = promisify(zipFile.openReadStream.bind(zipFile)) as (
    entry: yauzl.Entry
  ) => Promise<NodeJS.ReadableStream>;
  const zipReadStream = await openReadStream(entry);
  const zipReadStreamPromise = new Promise<void>((resolve, reject) => {
    zipReadStream.once('end', resolve);
    zipReadStream.once('error', reject);
  });
  zipReadStream.pipe(writeStream);

  // Wait for the zipReadStream and writeStream to end before returning
  await Promise.all([zipReadStreamPromise, writeStreamPromise]);
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
  onEntry: (entry: ZipEntry) => boolean | void | Promise<boolean | void>
): Promise<void> {
  // Open a zip file and start reading entries
  const zipfile = await openZip(zipFilePath, {lazyEntries: true});
  const zipReadStreamPromise = new Promise<void>((resolve, reject) => {
    zipfile.once('end', resolve);
    zipfile.once('error', reject);

    // On each entry, call 'onEntry' and then read the next entry
    zipfile.on('entry', async (entry: yauzl.Entry) => {
      const res = await onEntry({
        entry,
        extractEntryTo: async (destDir: string) => await _extractEntryTo(zipfile, entry, destDir),
      });
      if (res === false) {
        return zipfile.emit('end');
      }
      zipfile.readEntry();
    });
  });
  zipfile.readEntry();

  // Wait for the entries to finish being iterated through
  await zipReadStreamPromise;
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
export async function toInMemoryZip(
  srcPath: string,
  opts: ZipOptions = {}
): Promise<Buffer> {
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
          new Error(
            `The size of the resulting ` +
              `archive must not be greater than ${toReadableSizeString(maxSize)}`
          )
        );
      }
      next();
    },
  });

  // Zip 'srcDir' and stream it to the above writable stream
  const archive = archiver('zip', {
    zlib: {level},
  });
  let srcSize: number | null = null;
  const base64EncoderStream = encodeToBase64 ? new Base64Encode() : null;
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
    archive.once('error', (e: Error) =>
      reject(new Error(`Failed to archive '${srcPath}': ${e.message}`))
    );
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
  archive.finalize();

  // Wait for the streams to finish
  await Promise.all([archiveStreamPromise, resultWriteStreamPromise]);

  if (timer) {
    log.debug(
      `Zipped ${encodeToBase64 ? 'and base64-encoded ' : ''}` +
        `'${path.basename(srcPath)}' ` +
        (srcSize ? `(${toReadableSizeString(srcSize)}) ` : '') +
        `in ${timer.getDuration().asSeconds.toFixed(3)}s ` +
        `(compression level: ${level})`
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
          `is not equal to the expected ZIP archive signature '${ZIP_MAGIC}'`
      );
    }
    return true;
  } finally {
    await fs.close(fd);
  }
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
  opts: ZipCompressionOptions = {}
): Promise<void> {
  const {level = 9} = opts;
  const {pattern = '**/*', cwd = path.dirname(dstPath), ignore = []} = src;
  const archive = archiver('zip', {zlib: {level}});
  const outStream = fs.createWriteStream(dstPath);
  await new Promise<void>((resolve, reject) => {
    archive
      .glob(pattern, {
        cwd,
        ignore,
      })
      .on('error', reject)
      .pipe(outStream);
    outStream
      .on('error', (e: Error) => {
        archive.unpipe(outStream);
        archive.abort();
        archive.destroy();
        reject(e);
      })
      .on('finish', resolve);
    archive.finalize();
  });
}

interface ZipExtractorOptions {
  dir: string;
  fileNamesEncoding?: BufferEncoding;
  defaultDirMode?: string;
  defaultFileMode?: string;
}

// This class is mostly copied from https://github.com/maxogden/extract-zip/blob/master/index.js
class ZipExtractor {
  zipfile!: yauzl.ZipFile;
  private readonly zipPath: string;
  private readonly opts: ZipExtractorOptions;
  private canceled = false;

  constructor(sourcePath: string, opts: ZipExtractorOptions) {
    this.zipPath = sourcePath;
    this.opts = opts;
  }

  private extractFileName(entry: yauzl.Entry): string {
    if (Buffer.isBuffer(entry.fileName)) {
      return entry.fileName.toString(this.opts.fileNamesEncoding);
    }
    return entry.fileName;
  }

  async extract(): Promise<void> {
    const {dir, fileNamesEncoding} = this.opts;
    this.zipfile = await openZip(this.zipPath, {
      lazyEntries: true,
      // https://github.com/thejoshwolfe/yauzl/commit/cc7455ac789ba84973184e5ebde0581cdc4c3b39#diff-04c6e90faac2675aa89e2176d2eec7d8R95
      decodeStrings: !fileNamesEncoding,
    });
    this.canceled = false;

    return new Promise<void>((resolve, reject) => {
      this.zipfile.on('error', (err: Error) => {
        this.canceled = true;
        reject(err);
      });
      this.zipfile.readEntry();

      this.zipfile.on('close', () => {
        if (!this.canceled) {
          resolve();
        }
      });

      this.zipfile.on('entry', async (entry: yauzl.Entry) => {
        if (this.canceled) {
          return;
        }

        const fileName = this.extractFileName(entry);
        if (fileName.startsWith('__MACOSX/')) {
          this.zipfile.readEntry();
          return;
        }

        const destDir = path.dirname(path.join(dir, fileName));
        try {
          await fs.mkdir(destDir, {recursive: true});

          const canonicalDestDir = await fs.realpath(destDir);
          const relativeDestDir = path.relative(dir, canonicalDestDir);

          if (relativeDestDir.split(path.sep).includes('..')) {
            throw new Error(
              `Out of bound path "${canonicalDestDir}" found while processing file ${fileName}`
            );
          }

          await this.extractEntry(entry);
          this.zipfile.readEntry();
        } catch (err) {
          this.canceled = true;
          this.zipfile.close();
          reject(err);
        }
      });
    });
  }

  private async extractEntry(entry: yauzl.Entry): Promise<void> {
    if (this.canceled) {
      return;
    }

    const {dir} = this.opts;

    const fileName = this.extractFileName(entry);
    const dest = path.join(dir, fileName);

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
    const procMode = this.getExtractedMode(mode, isDir) & 0o777;
    // always ensure folders are created
    const destDir = isDir ? dest : path.dirname(dest);
    const mkdirOptions: Parameters<typeof fs.mkdir>[1] = {recursive: true};
    if (isDir) {
      mkdirOptions.mode = procMode;
    }
    await fs.mkdir(destDir, mkdirOptions);
    if (isDir) {
      return;
    }

    const openReadStream = promisify(
      this.zipfile.openReadStream.bind(this.zipfile)
    ) as (entry: yauzl.Entry) => Promise<NodeJS.ReadableStream>;
    const readStream = await openReadStream(entry);
    if (isSymlink) {
      const link = await getStream(readStream);
      await fs.symlink(link, dest);
    } else {
      await pipeline(readStream, fs.createWriteStream(dest, {mode: procMode}));
    }
  }

  private getExtractedMode(entryMode: number, isDir: boolean): number {
    const {defaultDirMode, defaultFileMode} = this.opts;

    let mode = entryMode;
    // Set defaults, if necessary
    if (mode === 0) {
      if (isDir) {
        if (defaultDirMode) {
          mode = parseInt(defaultDirMode, 10);
        }

        if (!mode) {
          mode = 0o755;
        }
      } else {
        if (defaultFileMode) {
          mode = parseInt(defaultFileMode, 10);
        }

        if (!mode) {
          mode = 0o644;
        }
      }
    }

    return mode;
  }
}

/**
 * Executes system unzip (e.g., `/usr/bin/unzip`). If available, it is
 * significantly faster than the JS implementation.
 * By default all files in the destDir get overridden if already exist.
 *
 * @param zipFilePath The full path to the source ZIP file
 * @param destDir The full path to the destination folder.
 * This folder is expected to already exist before extracting the archive.
 */
async function extractWithSystemUnzip(zipFilePath: string, destDir: string): Promise<void> {
  const isWindowsHost = isWindows();
  let executablePath: string;
  try {
    executablePath = await getExecutablePath(isWindowsHost ? 'powershell.exe' : 'unzip');
  } catch {
    throw new Error('Could not find system unzip');
  }

  if (isWindowsHost) {
    // on Windows we use PowerShell to unzip files
    await exec(executablePath, [
      '-command',
      'Expand-Archive',
      '-LiteralPath',
      zipFilePath,
      '-DestinationPath',
      destDir,
      '-Force',
    ]);
  } else {
    // -q means quiet (no stdout)
    // -o means overwrite
    // -d is the dest dir
    await exec(executablePath, ['-q', '-o', zipFilePath, '-d', destDir]);
  }
}

/**
 * Finds and memoizes the full path to the given executable.
 * Rejects if it is not found.
 */
const getExecutablePath = _.memoize(
  /**
   * @returns Full Path to the executable
   */
  async function getExecutablePath(binaryName: string): Promise<string> {
    const fullPath = await fs.which(binaryName);
    log.debug(`Found '${binaryName}' at '${fullPath}'`);
    return fullPath;
  }
);

export default {
  extractAllTo,
  readEntries,
  toInMemoryZip,
  assertValidZip,
  toArchive,
};

