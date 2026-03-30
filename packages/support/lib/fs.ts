import B from 'bluebird';
import crypto from 'node:crypto';
import {
  close,
  constants,
  createReadStream,
  createWriteStream,
  promises as fsPromises,
  read,
  write,
  rmSync,
  open,
  type PathLike,
  type MakeDirectoryOptions,
  type ReadAsyncOptions,
  type Stats,
} from 'node:fs';
import {promisify} from 'node:util';
import {glob} from 'glob';
import type {GlobOptions} from 'glob';
import klaw from 'klaw';
import type {Walker} from 'klaw';
import _ from 'lodash';
import ncp from 'ncp';
import {packageDirectorySync} from 'package-directory';
import path from 'node:path';
import {readPackageSync, type NormalizeOptions, type NormalizedPackageJson} from 'read-pkg';
import sanitize from 'sanitize-filename';
import which from 'which';
import log from './logger';
import {Timer} from './timing';
import {isWindows} from './system';
import {pluralize} from './util';

const ncpAsync = promisify(ncp) as (
  source: string,
  dest: string,
  opts?: ncp.Options
) => Promise<void>;
const findRootCached = _.memoize(
  packageDirectorySync,
  (opts: {cwd?: string} | undefined) => opts?.cwd
);

/** Options for {@linkcode fs.mv} */
export interface MvOptions {
  /** Whether to automatically create the destination folder structure */
  mkdirp?: boolean;
  /** Set to false to throw if the destination file already exists */
  clobber?: boolean;
  /** @deprecated Legacy, not used */
  limit?: number;
}

/**
 * Callback used during directory walking in {@linkcode fs.walkDir}.
 * Return true to stop walking.
 */
export type WalkDirCallback = (
  itemPath: string,
  isDirectory: boolean
) => boolean | void | Promise<boolean | void>;

/**
 * Promisified fs.read signature.
 * @template TBuffer - Buffer type (e.g. NodeJS.ArrayBufferView)
 * @deprecated use `typeof read.__promisify__` instead
 */
export type ReadFn<TBuffer extends NodeJS.ArrayBufferView = NodeJS.ArrayBufferView> = (
  fd: number,
  buffer: TBuffer | ReadAsyncOptions<TBuffer>,
  offset?: number,
  length?: number,
  position?: number | null
) => B<{bytesRead: number; buffer: TBuffer}>;

function isErrnoException(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}

export const fs = {
  /**
   * Resolves `true` if `path` is _readable_.
   * On Windows, ACLs are not supported, so this becomes a simple check for existence.
   * This function will never reject.
   */
  async hasAccess(filePath: PathLike): Promise<boolean> {
    try {
      await fsPromises.access(filePath, constants.R_OK);
    } catch {
      return false;
    }
    return true;
  },

  /**
   * Resolves `true` if `path` is executable; `false` otherwise.
   * On Windows, delegates to {@linkcode fs.hasAccess}.
   * This function will never reject.
   */
  async isExecutable(filePath: PathLike): Promise<boolean> {
    try {
      if (isWindows()) {
        return await fs.hasAccess(filePath);
      }
      await fsPromises.access(filePath, constants.R_OK | constants.X_OK);
    } catch {
      return false;
    }
    return true;
  },

  /** Alias for {@linkcode fs.hasAccess} */
  async exists(filePath: PathLike): Promise<boolean> {
    return await fs.hasAccess(filePath);
  },

  /**
   * Remove a directory and all its contents, recursively.
   * @see https://nodejs.org/api/fs.html#fspromisesrmpath-options
   */
  async rimraf(filepath: PathLike): Promise<void> {
    return await fsPromises.rm(filepath, {recursive: true, force: true});
  },

  /**
   * Remove a directory and all its contents, recursively (sync).
   * @see https://nodejs.org/api/fs.html#fsrmsyncpath-options
   */
  rimrafSync(filepath: PathLike): void {
    return rmSync(filepath, {recursive: true, force: true});
  },

  /**
   * Like Node.js `fsPromises.mkdir()`, but will not reject if the directory already exists.
   * @see https://nodejs.org/api/fs.html#fspromisesmkdirpath-options
   */
  async mkdir(
    filepath: string | Buffer | URL,
    opts: MakeDirectoryOptions = {}
  ): Promise<string | undefined> {
    try {
      return await fsPromises.mkdir(filepath, opts);
    } catch (err) {
      if (isErrnoException(err) && err.code !== 'EEXIST') {
        throw err;
      }
    }
  },

  /**
   * Copies files and entire directories.
   * @see https://npm.im/ncp
   */
  async copyFile(
    source: string,
    destination: string,
    opts: ncp.Options = {}
  ): Promise<void> {
    if (!(await fs.hasAccess(source))) {
      throw new Error(`The file at '${source}' does not exist or is not accessible`);
    }
    return await ncpAsync(source, destination, opts);
  },

  /** Create an MD5 hash of a file. */
  async md5(filePath: PathLike): Promise<string> {
    return await fs.hash(filePath, 'md5');
  },

  /**
   * Move a file or a folder.
   */
  async mv(
    from: string,
    to: string,
    opts: MvOptions = {}
  ): Promise<void> {
    const ensureDestination = async (p: PathLike): Promise<boolean> => {
      if (opts?.mkdirp && !(await this.exists(p))) {
        await fsPromises.mkdir(p, {recursive: true});
        return true;
      }
      return false;
    };
    const renameFile = async (
      src: PathLike,
      dst: PathLike,
      skipExistenceCheck: boolean
    ): Promise<void> => {
      if (!skipExistenceCheck && (await this.exists(dst))) {
        if (opts?.clobber === false) {
          const err = new Error(`The destination path '${dst}' already exists`) as NodeJS.ErrnoException;
          err.code = 'EEXIST';
          throw err;
        }
        await this.rimraf(dst);
      }
      try {
        await fsPromises.rename(src, dst);
      } catch (err) {
        if (isErrnoException(err) && err.code === 'EXDEV') {
          await this.copyFile(String(src), String(dst));
          await this.rimraf(src);
        } else {
          throw err;
        }
      }
    };

    let fromStat: Stats;
    try {
      fromStat = await fsPromises.stat(from);
    } catch (err) {
      if (isErrnoException(err) && err.code === 'ENOENT') {
        throw new Error(`The source path '${from}' does not exist or is not accessible`);
      }
      throw err;
    }
    if (fromStat.isFile()) {
      const dstRootWasCreated = await ensureDestination(path.dirname(to));
      await renameFile(from, to, dstRootWasCreated);
    } else if (fromStat.isDirectory()) {
      const dstRootWasCreated = await ensureDestination(to);
      const items = await fsPromises.readdir(from, {withFileTypes: true});
      for (const item of items) {
        const srcPath = path.join(from, item.name);
        const destPath = path.join(to, item.name);
        if (item.isDirectory()) {
          await this.mv(srcPath, destPath, opts);
        } else if (item.isFile()) {
          await renameFile(srcPath, destPath, dstRootWasCreated);
        }
      }
    } else {
      return;
    }

    await this.rimraf(from);
  },

  /** Find path to an executable in system `PATH`. @see https://github.com/npm/node-which */
  which,

  /**
   * Given a glob pattern, resolve with list of files matching that pattern.
   * @see https://github.com/isaacs/node-glob
   */
  glob(pattern: string, options?: GlobOptions): Promise<string[]> {
    return Promise.resolve(
      (options ? glob(pattern, options) : glob(pattern)) as Promise<string[]>
    );
  },

  /** Sanitize a filename. @see https://github.com/parshap/node-sanitize-filename */
  sanitizeName: sanitize,

  /** Create a hex digest of some file at `filePath`. */
  async hash(filePath: PathLike, algorithm: string = 'sha1'): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const fileHash = crypto.createHash(algorithm);
      const readStream = createReadStream(filePath);
      readStream.on('error', (e: Error) =>
        reject(
          new Error(
            `Cannot calculate ${algorithm} hash for '${filePath}'. Original error: ${e.message}`
          )
        )
      );
      readStream.on('data', (chunk: Buffer | string) => fileHash.update(chunk));
      readStream.on('end', () => resolve(fileHash.digest('hex')));
    });
  },

  /**
   * Returns a Walker instance (readable stream / async iterator).
   * @see https://www.npmjs.com/package/klaw
   */
  walk(dir: string, opts?: klaw.Options): Walker {
    return klaw(dir, opts);
  },

  /** Recursively create a directory. */
  async mkdirp(dir: PathLike): Promise<string | undefined> {
    return await fs.mkdir(dir, {recursive: true});
  },

  /**
   * Walks a directory; callback is invoked with path joined with dir.
   * @param dir - Directory path to start walking
   * @param recursive - If true, walk subdirectories
   * @param callback - Called for each path; return true to stop
   * @returns The found path or null if not found
   */
  /* eslint-disable promise/prefer-await-to-callbacks -- walkDir uses callback + stream .on() + Promise executor */
  async walkDir(
    dir: string,
    recursive: boolean,
    callback: WalkDirCallback
  ): Promise<string | null> {
    let isValidRoot = false;
    let errMsg: string | null = null;
    try {
      isValidRoot = (await fs.stat(dir)).isDirectory();
    } catch (e) {
      errMsg = e instanceof Error ? e.message : String(e);
    }
    if (!isValidRoot) {
      throw new Error(
        `'${dir}' is not a valid root directory` +
          (errMsg ? `. Original error: ${errMsg}` : '')
      );
    }

    let walker: Walker | undefined;
    let fileCount = 0;
    let directoryCount = 0;
    const timer = new Timer().start();
    return await new Promise<string | null>(function (resolve, reject) {
      let lastFileProcessed: Promise<string | undefined> = Promise.resolve(undefined);
      walker = klaw(dir, {
        depthLimit: recursive ? -1 : 0,
      });
      walker
        .on('data', function (item: klaw.Item) {
          if (walker) {
            walker.pause();
          }

          if (!item.stats.isDirectory()) {
            fileCount++;
          } else {
            directoryCount++;
          }

          lastFileProcessed = (async () => {
            try {
              const done = await callback(item.path, item.stats.isDirectory());
              if (done) {
                resolve(item.path);
                return item.path;
              }
              if (walker) {
                walker.resume();
              }
            } catch (err) {
              reject(err);
            }
          })();
        })
        .on('error', function (err: Error, item?: {path: string}) {
          log.warn(`Got an error while walking '${item?.path ?? 'unknown'}': ${err.message}`);
          if (isErrnoException(err) && err.code === 'ENOENT') {
            log.warn('All files may not have been accessed');
            reject(err);
          }
        })
        .on('end', function () {
          (async () => {
            try {
              const file = await lastFileProcessed;
              resolve(file ?? null);
            } catch (err) {
              log.warn(`Unexpected error: ${err instanceof Error ? err.message : err}`);
              reject(err);
            }
          })();
        });
    }).finally(function () {
      log.debug(
        `Traversed ${pluralize('directory', directoryCount, true)} ` +
          `and ${pluralize('file', fileCount, true)} ` +
          `in ${timer.getDuration().asMilliSeconds.toFixed(0)}ms`
      );
      if (walker) {
        walker.destroy();
      }
    });
    /* eslint-enable promise/prefer-await-to-callbacks */
  },

  /**
   * Reads the closest `package.json` from absolute path `dir`.
   * @throws If there were problems finding or reading `package.json`
   */
  readPackageJsonFrom(
    dir: string,
    opts: NormalizeOptions & {cwd?: string} = {}
  ): NormalizedPackageJson {
    const cwd = fs.findRoot(dir);
    try {
      return readPackageSync({normalize: true, ...opts, cwd});
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      (err as Error).message = `Failed to read a \`package.json\` from dir \`${dir}\`:\n\n${message}`;
      throw err;
    }
  },

  /**
   * Finds the project root directory from `dir`.
   * @throws TypeError If `dir` is not a non-empty absolute path
   * @throws Error If project root could not be found
   */
  findRoot(dir: string): string {
    if (!dir || !path.isAbsolute(dir)) {
      throw new TypeError('`findRoot()` must be provided a non-empty, absolute path');
    }
    const result = findRootCached({cwd: dir});
    if (!result) {
      throw new Error(`\`findRoot()\` could not find \`package.json\` from ${dir}`);
    }
    return result;
  },

  access: fsPromises.access,
  appendFile: fsPromises.appendFile,
  chmod: fsPromises.chmod,
  close: promisify(close),
  constants,
  createWriteStream,
  createReadStream,
  lstat: fsPromises.lstat,
  /**
   * Promisified fs.open. Resolves with a file descriptor (not FileHandle).
   * Use fs.openFile for a FileHandle.
   */
  open: promisify(open),
  openFile: fsPromises.open,
  readdir: fsPromises.readdir,
  read: promisify(read),
  readFile: fsPromises.readFile,
  readlink: fsPromises.readlink,
  realpath: fsPromises.realpath,
  rename: fsPromises.rename,
  stat: fsPromises.stat,
  symlink: fsPromises.symlink,
  unlink: fsPromises.unlink,
  // TODO: replace with native promisify in Appium 4
  write: B.promisify(write),
  writeFile: fsPromises.writeFile,

  /** @deprecated Use `constants.F_OK` instead. */
  F_OK: constants.F_OK,
  /** @deprecated Use `constants.R_OK` instead. */
  R_OK: constants.R_OK,
  /** @deprecated Use `constants.W_OK` instead. */
  W_OK: constants.W_OK,
  /** @deprecated Use `constants.X_OK` instead. */
  X_OK: constants.X_OK,
};

export default fs;
