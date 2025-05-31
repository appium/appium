import _ from 'lodash';
import B from 'bluebird';
import yauzl from 'yauzl';
import archiver from 'archiver';
import {createWriteStream} from 'fs';
import path from 'path';
import stream from 'stream';
import {fs} from './fs';
import {isWindows} from './system';
import {Base64Encode} from 'base64-stream';
import {toReadableSizeString, GiB} from './util';
import {Timer} from './timing';
import log from './logger';
import getStream from 'get-stream';
import {exec} from 'teen_process';

/**
 * @type {(path: string, options?: yauzl.Options) => Promise<yauzl.ZipFile>}
 */
// eslint-disable-next-line import/no-named-as-default-member
const openZip = B.promisify(yauzl.open);
/**
 * @type {(source: NodeJS.ReadableStream, destination: NodeJS.WritableStream) => Promise<NodeJS.WritableStream>}
 */
const pipeline = B.promisify(stream.pipeline);
const ZIP_MAGIC = 'PK';
const IFMT = 61440;
const IFDIR = 16384;
const IFLNK = 40960;

// This class is mostly copied from https://github.com/maxogden/extract-zip/blob/master/index.js
class ZipExtractor {
  /** @type {yauzl.ZipFile} */
  zipfile;

  constructor(sourcePath, opts = {}) {
    this.zipPath = sourcePath;
    this.opts = opts;
    this.canceled = false;
  }

  extractFileName(entry) {
    return _.isBuffer(entry.fileName)
      ? entry.fileName.toString(this.opts.fileNamesEncoding)
      : entry.fileName;
  }

  async extract() {
    const {dir, fileNamesEncoding} = this.opts;
    this.zipfile = await openZip(this.zipPath, {
      lazyEntries: true,
      // https://github.com/thejoshwolfe/yauzl/commit/cc7455ac789ba84973184e5ebde0581cdc4c3b39#diff-04c6e90faac2675aa89e2176d2eec7d8R95
      decodeStrings: !fileNamesEncoding,
    });
    this.canceled = false;

    return new B((resolve, reject) => {
      this.zipfile.on('error', (err) => {
        this.canceled = true;
        reject(err);
      });
      this.zipfile.readEntry();

      this.zipfile.on('close', () => {
        if (!this.canceled) {
          resolve();
        }
      });

      this.zipfile.on('entry', async (entry) => {
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
            new Error(
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

  async extractEntry(entry) {
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
    const mkdirOptions = {recursive: true};
    if (isDir) {
      mkdirOptions.mode = procMode;
    }
    await fs.mkdir(destDir, mkdirOptions);
    if (isDir) {
      return;
    }

    /** @type {(entry: yauzl.Entry) => Promise<NodeJS.ReadableStream>} */
    const openReadStream = B.promisify(this.zipfile.openReadStream.bind(this.zipfile));
    const readStream = await openReadStream(entry);
    if (isSymlink) {
      // @ts-ignore This typecast is ok
      const link = await getStream(readStream);
      await fs.symlink(link, dest);
    } else {
      await pipeline(readStream, fs.createWriteStream(dest, {mode: procMode}));
    }
  }

  getExtractedMode(entryMode, isDir) {
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
 * @typedef ExtractAllOptions
 * @property {string} [fileNamesEncoding] The encoding to use for extracted file names.
 * For ZIP archives created on MacOS it is usually expected to be `utf8`.
 * By default it is autodetected based on the entry metadata and is only needed to be set explicitly
 * if the particular archive does not comply to the standards, which leads to corrupted file names
 * after extraction. Only applicable if system unzip binary is NOT being used.
 * @property {boolean} [useSystemUnzip] If true, attempt to use system unzip; if this fails,
 * fallback to the JS unzip implementation.
 */

/**
 * Extract zipfile to a directory
 *
 * @param {string} zipFilePath The full path to the source ZIP file
 * @param {string} destDir The full path to the destination folder
 * @param {ExtractAllOptions} [opts]
 */
async function extractAllTo(zipFilePath, destDir, opts = /** @type {ExtractAllOptions} */ ({})) {
  if (!path.isAbsolute(destDir)) {
    throw new Error(`Target path '${destDir}' is expected to be absolute`);
  }

  await fs.mkdir(destDir, {recursive: true});
  const dir = await fs.realpath(destDir);
  if (opts.useSystemUnzip) {
    try {
      await extractWithSystemUnzip(zipFilePath, dir);
      return;
    } catch (err) {
      log.warn('unzip failed; falling back to JS: %s', err.stderr || err.message);
    }
  }
  const extractor = new ZipExtractor(zipFilePath, {
    ...opts,
    dir,
  });
  await extractor.extract();
}

/**
 * Executes system unzip (e.g., `/usr/bin/unzip`). If available, it is
 * significantly faster than the JS implementation.
 * By default all files in the destDir get overridden if already exist.
 *
 * @param {string} zipFilePath The full path to the source ZIP file
 * @param {string} destDir The full path to the destination folder.
 * This folder is expected to already exist before extracting the archive.
 */
async function extractWithSystemUnzip(zipFilePath, destDir) {
  const isWindowsHost = isWindows();
  let executablePath;
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
 * Extract a single zip entry to a directory
 *
 * @param {yauzl.ZipFile} zipFile The source ZIP stream
 * @param {yauzl.Entry} entry The entry instance
 * @param {string} destDir The full path to the destination folder
 */
async function _extractEntryTo(zipFile, entry, destDir) {
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
  const writeStreamPromise = new B((resolve, reject) => {
    writeStream.once('finish', resolve);
    writeStream.once('error', reject);
  });

  // Create zipReadStream and pipe data to the write stream
  // (for some odd reason B.promisify doesn't work on zipfile.openReadStream, it causes an error 'closed')
  const zipReadStream = await new B((resolve, reject) => {
    zipFile.openReadStream(entry, (err, readStream) => (err ? reject(err) : resolve(readStream)));
  });
  const zipReadStreamPromise = new B((resolve, reject) => {
    zipReadStream.once('end', resolve);
    zipReadStream.once('error', reject);
  });
  zipReadStream.pipe(writeStream);

  // Wait for the zipReadStream and writeStream to end before returning
  return await B.all([zipReadStreamPromise, writeStreamPromise]);
}

/**
 * @typedef ZipEntry
 * @property {yauzl.Entry} entry The actual entry instance
 * @property {function} extractEntryTo An async function, which accepts one parameter.
 * This parameter contains the destination folder path to which this function is going to extract the entry.
 */

/**
 * Get entries for a zip folder
 *
 * @param {string} zipFilePath The full path to the source ZIP file
 * @param {function} onEntry Callback when entry is read.
 * The callback is expected to accept one argument of ZipEntry type.
 * The iteration through the source zip file will bi terminated as soon as
 * the result of this function equals to `false`.
 */
async function readEntries(zipFilePath, onEntry) {
  // Open a zip file and start reading entries
  const zipfile = await openZip(zipFilePath, {lazyEntries: true});
  const zipReadStreamPromise = new B((resolve, reject) => {
    zipfile.once('end', resolve);
    zipfile.once('error', reject);

    // On each entry, call 'onEntry' and then read the next entry
    zipfile.on('entry', async (entry) => {
      const res = await onEntry({
        entry,
        extractEntryTo: async (destDir) => await _extractEntryTo(zipfile, entry, destDir),
      });
      if (res === false) {
        return zipfile.emit('end');
      }
      zipfile.readEntry();
    });
  });
  zipfile.readEntry();

  // Wait for the entries to finish being iterated through
  return await zipReadStreamPromise;
}

/**
 * @typedef ZipOptions
 * @property {boolean} [encodeToBase64=false] Whether to encode
 * the resulting archive to a base64-encoded string
 * @property {boolean} [isMetered=true] Whether to log the actual
 * archiver performance
 * @property {number} [maxSize=1073741824] The maximum size of
 * the resulting archive in bytes. This is set to 1GB by default, because
 * Appium limits the maximum HTTP body size to 1GB. Also, the NodeJS heap
 * size must be enough to keep the resulting object (usually this size is
 * limited to 1.4 GB)
 * @property {number} [level=9] The compression level. The maximum
 * level is 9 (the best compression, worst performance). The minimum
 * compression level is 0 (no compression).
 */

/**
 * Converts contents of local directory to an in-memory .zip buffer
 *
 * @param {string} srcPath The full path to the folder or file being zipped
 * @param {ZipOptions} opts Zipping options
 * @returns {Promise<Buffer>} Zipped (and encoded if `encodeToBase64` is truthy)
 * content of the source path as memory buffer
 * @throws {Error} if there was an error while reading the source
 * or the source is too big
 */
async function toInMemoryZip(srcPath, opts = /** @type {ZipOptions} */ ({})) {
  if (!(await fs.exists(srcPath))) {
    throw new Error(`No such file or folder: ${srcPath}`);
  }

  const {isMetered = true, encodeToBase64 = false, maxSize = 1 * GiB, level = 9} = opts;
  const resultBuffers = [];
  let resultBuffersSize = 0;
  // Create a writable stream that zip buffers will be streamed to
  const resultWriteStream = new stream.Writable({
    write: (buffer, encoding, next) => {
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
  let srcSize = null;
  const base64EncoderStream = encodeToBase64 ? new Base64Encode() : null;
  const resultWriteStreamPromise = new B((resolve, reject) => {
    resultWriteStream.once('error', (e) => {
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
  const archiveStreamPromise = new B((resolve, reject) => {
    archive.once('finish', resolve);
    archive.once('error', (e) => reject(new Error(`Failed to archive '${srcPath}': ${e.message}`)));
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
  await B.all([archiveStreamPromise, resultWriteStreamPromise]);

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
 * @param {string} filePath - Full path to the file
 * @throws {Error} If the file does not exist or is not a valid ZIP archive
 */
async function assertValidZip(filePath) {
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

/**
 * @typedef ZipCompressionOptions
 * @property {number} level [9] - Compression level in range 0..9
 * (greater numbers mean better compression, but longer processing time)
 */

/**
 * @typedef ZipSourceOptions
 * @property {string} [pattern='**\/*'] - GLOB pattern for compression
 * @property {string} [cwd] - The source root folder (the parent folder of
 * the destination file by default)
 * @property {string[]} [ignore] - The list of ignored patterns
 */

/**
 * Creates an archive based on the given glob pattern
 *
 * @param {string} dstPath - The resulting archive path
 * @param {ZipSourceOptions} src - Source options
 * @param {ZipCompressionOptions} opts - Compression options
 * @throws {Error} If there was an error while creating the archive
 */
async function toArchive(
  dstPath,
  src = /** @type {ZipSourceOptions} */ ({}),
  opts = /** @type {ZipCompressionOptions} */ ({})
) {
  const {level = 9} = opts;
  const {pattern = '**/*', cwd = path.dirname(dstPath), ignore = []} = src;
  const archive = archiver('zip', {zlib: {level}});
  const stream = fs.createWriteStream(dstPath);
  return await new B((resolve, reject) => {
    archive
      .glob(pattern, {
        cwd,
        ignore,
      })
      .on('error', reject)
      .pipe(stream);
    stream
      .on('error', (e) => {
        archive.unpipe(stream);
        archive.abort();
        archive.destroy();
        reject(e);
      })
      .on('finish', resolve);
    archive.finalize();
  });
}

/**
 * Finds and memoizes the full path to the given executable.
 * Rejects if it is not found.
 */
const getExecutablePath = _.memoize(
  /**
   * @returns {Promise<string>} Full Path to the executable
   */
  async function getExecutablePath(binaryName) {
    const fullPath = await fs.which(binaryName);
    log.debug(`Found '${binaryName}' at '${fullPath}'`);
    return fullPath;
  }
);

export {extractAllTo, readEntries, toInMemoryZip, _extractEntryTo, assertValidZip, toArchive};
export default {
  extractAllTo,
  readEntries,
  toInMemoryZip,
  assertValidZip,
  toArchive,
};
