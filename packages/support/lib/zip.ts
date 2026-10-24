import {createWriteStream} from 'node:fs';
import path from 'node:path';
import stream from 'node:stream';
import {text} from 'node:stream/consumers';
import {pipeline} from 'node:stream/promises';
import {promisify} from 'node:util';

// @ts-ignore - archiver 8.0 types are not available; 7.x types don't match
import {ZipArchive} from 'archiver';
import {exec} from 'teen_process';
import * as yauzl from 'yauzl';

import {fs} from './fs.js';
import {createBase64EncodeStream} from './internal/index.js';
import log from './logger.js';
import {isWindows} from './system.js';
import {Timer} from './timing.js';
import {GiB, isSubPath, memoize, toReadableSizeString} from './util.js';

const openZip = promisify(yauzl.open) as (zipPath: string, options?: yauzl.Options) => Promise<yauzl.ZipFile>;

const ZIP_MAGIC = 'PK';
const IFMT = 0b1111000000000000;
const IFDIR = 0b0100000000000000;
const IFLNK = 0b1010000000000000;
// Limit traversal to stop symlink cycles.
const MAX_SYMLINK_TRAVERSALS = 40;
// Upper bound of the remembered folders, they are simply verified again if it is exceeded.
const MAX_VERIFIED_DIRS = 100_000;

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

interface ZipExtractorOptions {
  dir: string;
  fileNamesEncoding?: BufferEncoding;
  defaultDirMode?: string;
  defaultFileMode?: string;
}

type OpenReadStreamFn = (entry: yauzl.Entry) => Promise<stream.Readable>;

/** A folder inside of the root that was checked, with the real path it resolved to at that moment */
interface VerifiedDir {
  realPath: string;
}

interface SymlinkTarget {
  linkTarget: string;
  linkParentDir: string;
  fileName: string;
  missingPaths: Set<string>;
}

// This class is mostly copied from https://github.com/maxogden/extract-zip/blob/master/index.js
class ZipExtractor {
  zipfile!: yauzl.ZipFile;
  private openReadStream!: OpenReadStreamFn;
  private readonly zipPath: string;
  private readonly opts: ZipExtractorOptions;
  private canceled = false;
  // Normalized missing-path keys -> links to recheck when those paths become symlinks.
  private readonly symlinkDependents = new Map<string, Set<SymlinkTarget>>();
  // Directories already validated within the root.
  private readonly verifiedDirs = new Map<string, VerifiedDir>();

  constructor(sourcePath: string, opts: ZipExtractorOptions) {
    this.zipPath = sourcePath;
    this.opts = opts;
  }

  async extract(): Promise<void> {
    const {fileNamesEncoding} = this.opts;
    this.zipfile = await openZip(this.zipPath, {
      lazyEntries: true,
      // https://github.com/thejoshwolfe/yauzl/commit/cc7455ac789ba84973184e5ebde0581cdc4c3b39#diff-04c6e90faac2675aa89e2176d2eec7d8R95
      decodeStrings: !fileNamesEncoding,
    });
    this.openReadStream = createOpenReadStream(this.zipfile);
    this.canceled = false;

    const {dir} = this.opts;

    try {
      await processYauzlEntriesSequentially(this.zipfile, async (entry) => {
        if (this.canceled) {
          return false;
        }

        const fileName = this.extractFileName(entry);
        if (fileName.startsWith('__MACOSX/')) {
          return;
        }

        const dest = path.resolve(dir, fileName);
        if (!isSubPath(dest, dir)) {
          throw new Error(`Out of bound path "${dest}" found while processing file ${fileName}`);
        }

        await this.extractEntry(entry, fileName, dest);
      });
    } catch (err) {
      this.canceled = true;
      throw err;
    }
  }

  private extractFileName(entry: yauzl.Entry): string {
    return toEntryFileName(entry, this.opts.fileNamesEncoding);
  }

  private async extractEntry(entry: yauzl.Entry, fileName: string, dest: string): Promise<void> {
    if (this.canceled) {
      return;
    }

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
    const verifiedDir = await this.ensureDirWithinRoot(destDir, fileName, isDir ? procMode : undefined);
    if (isDir) {
      return;
    }

    const {realPath: realDestDir} = verifiedDir;
    if (isSymlink) {
      const linkTarget = await text(await this.openReadStream(entry));
      await this.assertDirUnchanged(destDir, verifiedDir);
      await this.createValidatedSymlink(linkTarget, dest, realDestDir, fileName);
    } else {
      await this.assertDirUnchanged(destDir, verifiedDir);
      await this.assertFileDestinationWithinRoot(dest, realDestDir, fileName);
      const flags =
        fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_TRUNC |
        (isWindows() ? 0 : fs.constants.O_NOFOLLOW);
      const readStream = await this.openReadStream(entry);
      try {
        const file = await fs.openFile(dest, flags, procMode);
        try {
          await pipeline(readStream, file.createWriteStream());
        } finally {
          await file.close();
        }
      } finally {
        // Opening the output may fail before pipeline takes ownership of the input.
        readStream.destroy();
      }
    }
  }

  private async ensureDirWithinRoot(dirPath: string, fileName: string, mode?: number): Promise<VerifiedDir> {
    const cached = this.verifiedDirs.get(dirPath);
    if (cached) {
      return cached;
    }

    const {dir} = this.opts;
    if (!isSubPath(dirPath, dir)) {
      throw new Error(`Out of bound path "${dirPath}" found while processing file ${fileName}`);
    }

    const relativePath = path.relative(dir, dirPath);
    if (!relativePath) {
      return {realPath: dir};
    }

    if (this.verifiedDirs.size > MAX_VERIFIED_DIRS) {
      this.verifiedDirs.clear();
    }
    let current: VerifiedDir | undefined;
    let parent: VerifiedDir = {realPath: dir};
    let currentPath = dir;
    for (const segment of relativePath.split(path.sep)) {
      if (current) {
        parent = current;
      }
      currentPath = path.join(currentPath, segment);
      current = this.verifiedDirs.get(currentPath);
      if (current) {
        continue;
      }
      current = await this.inspectDir(currentPath, fileName);
      if (!current) {
        // The remembered parent is not looked up again by mkdir, so make sure it is still the verified one
        await this.assertDirUnchanged(path.dirname(currentPath), parent);
        // The result of mkdir is not trusted: whatever is there now is checked like an existing folder
        await fs.mkdir(currentPath, {mode});
        current = await this.inspectDir(currentPath, fileName);
      }
      if (!current) {
        throw new Error(`Cannot create the directory "${currentPath}" while processing file ${fileName}`);
      }
      this.verifiedDirs.set(currentPath, current);
    }
    return current as VerifiedDir;
  }

  /**
   * Resolves an existing folder (or a link to a folder) and checks it is within the root.
   *
   * @returns Undefined if the path does not exist
   */
  private async inspectDir(dirPath: string, fileName: string): Promise<VerifiedDir | undefined> {
    const {dir} = this.opts;
    try {
      // The folder itself, after following links: this is where the files end up
      const [stats, realPath] = await Promise.all([fs.stat(dirPath), fs.realpath(dirPath)]);
      if (!isSubPath(realPath, dir)) {
        throw new Error(`Out of bound path "${dirPath}" found while processing file ${fileName}`);
      }
      if (!stats.isDirectory()) {
        throw new Error(`Cannot create a directory over existing file "${dirPath}"`);
      }
      return {realPath};
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return undefined;
      }
      throw err;
    }
  }

  /**
   * Remembered folders are not checked again when they are reused, so make sure that neither
   * the folder nor any of its parents was replaced (e.g. with a link) since it was verified.
   */
  private async assertDirUnchanged(dirPath: string, verified: VerifiedDir): Promise<void> {
    if (dirPath === this.opts.dir) {
      return;
    }
    // The resolved path passes through the parents and links, so replacing or relocating any of them changes it
    if ((await fs.realpath(dirPath)) !== verified.realPath) {
      throw new Error(`Out of bound path "${dirPath}": the folder was replaced during the extraction`);
    }
  }

  private async assertFileDestinationWithinRoot(dest: string, realDestDir: string, fileName: string): Promise<void> {
    const {dir} = this.opts;
    let realDest: string | null = null;
    try {
      if ((await fs.lstat(dest)).isSymbolicLink()) {
        throw new Error(`Cannot write a file over existing symlink "${dest}"`);
      }
      realDest = await fs.realpath(dest);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }

    realDest = realDest ?? path.resolve(realDestDir, path.basename(dest));
    if (!isSubPath(realDest, dir)) {
      throw new Error(`Out of bound path "${dest}" found while processing file ${fileName}`);
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

  /**
   * Reject escaping targets or excessive traversal; return missing-path keys for later rechecks.
   */
  private async validateSymlinkTarget(
    linkTarget: string,
    linkParentDir: string,
    fileName: string,
  ): Promise<Set<string>> {
    // Resolve links before '..'; realpath alone cannot handle missing targets.
    const separator = isWindows() ? /[\\/]+/ : /\/+/;
    const targetRoot = path.isAbsolute(linkTarget) ? path.parse(linkTarget).root : '';
    let resolvedPath = targetRoot || linkParentDir;
    const remainingSegments = linkTarget.slice(targetRoot.length).split(separator);
    const missingPaths = new Set<string>();
    let followedLinks = 0;

    while (remainingSegments.length) {
      const segment = remainingSegments.shift();
      if (!segment || segment === '.') {
        continue;
      }
      if (segment === '..') {
        resolvedPath = path.dirname(resolvedPath);
        continue;
      }

      const candidatePath = path.join(resolvedPath, segment);
      let nestedLinkTarget: string | null = null;
      try {
        const stats = await fs.lstat(candidatePath);
        if (stats.isSymbolicLink()) {
          nestedLinkTarget = await fs.readlink(candidatePath);
        }
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
        // An absent component may become a symlink in a later ZIP entry.
        missingPaths.add(this.getSymlinkDependencyKey(candidatePath));
      }

      // Advance past ordinary or missing components.
      if (nestedLinkTarget === null) {
        resolvedPath = candidatePath;
        continue;
      }

      followedLinks += 1;
      if (followedLinks > MAX_SYMLINK_TRAVERSALS) {
        throw new Error(`Too many symlinks while processing file ${fileName}`);
      }
      // Resolve relative targets from the link's parent, absolute targets from their root.
      if (path.isAbsolute(nestedLinkTarget)) {
        resolvedPath = path.parse(nestedLinkTarget).root;
        nestedLinkTarget = nestedLinkTarget.slice(resolvedPath.length);
      }
      remainingSegments.unshift(...nestedLinkTarget.split(separator));
    }

    if (!isSubPath(resolvedPath, this.opts.dir)) {
      throw new Error(`Out of bound symlink target "${linkTarget}" found while processing file ${fileName}`);
    }
    return missingPaths;
  }

  private updateSymlinkDependencies(target: SymlinkTarget, missingPaths: Set<string>): void {
    for (const missingPath of target.missingPaths) {
      const dependents = this.symlinkDependents.get(missingPath);
      dependents?.delete(target);
      if (!dependents?.size) {
        this.symlinkDependents.delete(missingPath);
      }
    }
    target.missingPaths = missingPaths;
    for (const missingPath of missingPaths) {
      let dependents = this.symlinkDependents.get(missingPath);
      if (!dependents) {
        dependents = new Set();
        this.symlinkDependents.set(missingPath, dependents);
      }
      dependents.add(target);
    }
  }

  private async createValidatedSymlink(
    linkTarget: string,
    dest: string,
    linkParentDir: string,
    fileName: string,
  ): Promise<void> {
    // Reject an escaping target before creating the link on disk.
    await this.validateSymlinkTarget(linkTarget, linkParentDir, fileName);
    await fs.symlink(linkTarget, dest);
    try {
      const target: SymlinkTarget = {linkTarget, linkParentDir, fileName, missingPaths: new Set()};
      // Recheck for cycles and redirected forward references after creating the link.
      const key = this.getSymlinkDependencyKey(path.join(linkParentDir, path.basename(dest)));
      const affectedTargets = [target, ...(this.symlinkDependents.get(key) ?? [])];
      for (const affectedTarget of affectedTargets) {
        const missingPaths = await this.validateSymlinkTarget(
          affectedTarget.linkTarget,
          affectedTarget.linkParentDir,
          affectedTarget.fileName,
        );
        this.updateSymlinkDependencies(affectedTarget, missingPaths);
      }
    } catch (err) {
      // Roll back the link that invalidated a target.
      await fs.unlink(dest);
      throw err;
    }
  }

  private getSymlinkDependencyKey(absolutePath: string): string {
    // Normalize keys, not filesystem paths. Collisions only cause extra checks.
    return absolutePath.normalize('NFD').toLowerCase();
  }
}

/**
 * Extract zipfile to a directory
 *
 * @param zipFilePath The full path to the source ZIP file
 * @param destDir The full path to the destination folder
 * @param opts Extraction options
 */
export async function extractAllTo(zipFilePath: string, destDir: string, opts: ExtractAllOptions = {}): Promise<void> {
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

function createOpenReadStream(zipfile: yauzl.ZipFile): OpenReadStreamFn {
  return promisify(zipfile.openReadStream.bind(zipfile)) as OpenReadStreamFn;
}

function toEntryFileName(entry: yauzl.Entry, encoding?: BufferEncoding): string {
  if (Buffer.isBuffer(entry.fileName)) {
    return entry.fileName.toString(encoding ?? 'utf8');
  }
  return entry.fileName;
}

/**
 * Walk zip entries sequentially (yauzl `lazyEntries` contract).
 */
async function processYauzlEntriesSequentially(
  zipfile: yauzl.ZipFile,
  onEntry: (entry: yauzl.Entry) => Promise<boolean | void>,
): Promise<void> {
  let queue: Promise<void> = Promise.resolve();
  let stopped = false;

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const settleError = (err: unknown) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    };

    const settleSuccess = async () => {
      try {
        await queue;
        if (!settled) {
          settled = true;
          resolve();
        }
      } catch (err) {
        settleError(err);
      }
    };

    zipfile.on('error', settleError);
    zipfile.on('end', () => void settleSuccess());
    zipfile.on('close', () => void settleSuccess());

    zipfile.on('entry', (entry: yauzl.Entry) => {
      queue = queue
        .then(async () => {
          if (stopped) {
            return undefined;
          }
          const shouldContinue = await onEntry(entry);
          if (shouldContinue === false) {
            stopped = true;
            zipfile.close();
            return undefined;
          }
          zipfile.readEntry();
          return undefined;
        })
        .catch((err: unknown) => {
          stopped = true;
          zipfile.close();
          settleError(err);
          return undefined;
        });
    });

    zipfile.readEntry();
  });
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
  } catch (e) {
    throw new Error('Could not find system unzip', {cause: e});
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
const getExecutablePath = memoize(
  /**
   * @returns Full Path to the executable
   */
  async function getExecutablePath(binaryName: string): Promise<string> {
    const fullPath = await fs.which(binaryName);
    log.debug(`Found '${binaryName}' at '${fullPath}'`);
    return fullPath;
  },
);

export default {
  extractAllTo,
  readEntries,
  toInMemoryZip,
  assertValidZip,
  toArchive,
};
