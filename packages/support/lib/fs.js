// @ts-check

import B from 'bluebird';
import crypto from 'crypto';
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
} from 'fs';
import { glob } from 'glob';
import klaw from 'klaw';
import _ from 'lodash';
import mv from 'mv';
import ncp from 'ncp';
import path from 'path';
import pkgDir from 'pkg-dir';
import readPkg from 'read-pkg';
import sanitize from 'sanitize-filename';
import which from 'which';
import log from './logger';
import Timer from './timing';
import {isWindows} from './system';
import {pluralize} from './util';

const ncpAsync =
  /** @type {(source: string, dest: string, opts: ncp.Options|undefined) => B<void>} */ (
    B.promisify(ncp)
  );
const findRootCached = _.memoize(pkgDir.sync);

const fs = {
  /**
   * Resolves `true` if `path` is _readable_, which differs from Node.js' default behavior of "can we see it?"
   *
   * On Windows, ACLs are not supported, so this becomes a simple check for existence.
   *
   * This function will never reject.
   * @param {PathLike} path
   * @returns {Promise<boolean>}
   */
  async hasAccess(path) {
    try {
      await fsPromises.access(path, constants.R_OK);
    } catch {
      return false;
    }
    return true;
  },

  /**
   * Resolves `true` if `path` is executable; `false` otherwise.
   *
   * On Windows, this function delegates to {@linkcode fs.hasAccess}.
   *
   * This function will never reject.
   * @param {PathLike} path
   * @returns {Promise<boolean>}
   */
  async isExecutable(path) {
    try {
      if (isWindows()) {
        return await fs.hasAccess(path);
      }
      await fsPromises.access(path, constants.R_OK | constants.X_OK);
    } catch {
      return false;
    }
    return true;
  },

  /**
   * Alias for {@linkcode fs.hasAccess}
   * @param {PathLike} path
   */
  async exists(path) {
    return await fs.hasAccess(path);
  },

  /**
   * Remove a directory and all its contents, recursively
   * @param {PathLike} filepath
   * @returns Promise<void>
   * @see https://nodejs.org/api/fs.html#fspromisesrmpath-options
   */
  async rimraf(filepath) {
    return await fsPromises.rm(filepath, {recursive: true, force: true});
  },

  /**
   * Remove a directory and all its contents, recursively in sync
   * @param {PathLike} filepath
   * @returns undefined
   * @see https://nodejs.org/api/fs.html#fsrmsyncpath-options
   */
  rimrafSync(filepath) {
    return rmSync(filepath, {recursive: true, force: true});
  },

  /**
   * Like Node.js' `fsPromises.mkdir()`, but will _not_ reject if the directory already exists.
   *
   * @param {string|Buffer|URL} filepath
   * @param {import('fs').MakeDirectoryOptions} [opts]
   * @returns {Promise<string|undefined>}
   * @see https://nodejs.org/api/fs.html#fspromisesmkdirpath-options
   */
  async mkdir(filepath, opts = {}) {
    try {
      return await fsPromises.mkdir(filepath, opts);
    } catch (err) {
      if (err?.code !== 'EEXIST') {
        throw err;
      }
    }
  },
  /**
   * Copies files _and entire directories_
   * @param {string} source - Source to copy
   * @param {string} destination - Destination to copy to
   * @param {ncp.Options} [opts] - Additional arguments to pass to `ncp`
   * @see https://npm.im/ncp
   * @returns {Promise<void>}
   */
  async copyFile(source, destination, opts = {}) {
    if (!(await fs.hasAccess(source))) {
      throw new Error(`The file at '${source}' does not exist or is not accessible`);
    }
    return await ncpAsync(source, destination, opts);
  },

  /**
   * Create an MD5 hash of a file.
   * @param {PathLike} filePath
   * @returns {Promise<string>}
   */
  async md5(filePath) {
    return await fs.hash(filePath, 'md5');
  },

  /**
   * Move a file
   */
  mv: /** @type {(from: string, to: string, opts?: mv.Options) => B<void>} */ (B.promisify(mv)),

  /**
   * Find path to an executable in system `PATH`
   * @see https://github.com/npm/node-which
   */
  which,

  /**
   * Given a glob pattern, resolve with list of files matching that pattern
   * @see https://github.com/isaacs/node-glob
   */
  glob: /** @type {(pattern: string, opts?: import('glob').GlobOptions) => B<string[]>} */ (
    (pattern, options) => B.resolve(options ? glob(pattern, options) : glob(pattern))
  ),

  /**
   * Sanitize a filename
   * @see https://github.com/parshap/node-sanitize-filename
   */
  sanitizeName: sanitize,

  /**
   * Create a hex digest of some file at `filePath`
   * @param {PathLike} filePath
   * @param {string} [algorithm]
   * @returns {Promise<string>}
   */
  async hash(filePath, algorithm = 'sha1') {
    return await new B((resolve, reject) => {
      const fileHash = crypto.createHash(algorithm);
      const readStream = createReadStream(filePath);
      readStream.on('error', (e) =>
        reject(
          new Error(
            `Cannot calculate ${algorithm} hash for '${filePath}'. Original error: ${e.message}`
          )
        )
      );
      readStream.on('data', (chunk) => fileHash.update(chunk));
      readStream.on('end', () => resolve(fileHash.digest('hex')));
    });
  },

  /**
   * Returns an `Walker` instance, which is a readable stream (and thusly an async iterator).
   *
   * @param {string} dir - Dir to start walking at
   * @param {import('klaw').Options} [opts]
   * @returns {import('klaw').Walker}
   * @see https://www.npmjs.com/package/klaw
   */
  walk(dir, opts) {
    return klaw(dir, opts);
  },

  /**
   * Recursively create a directory.
   * @param {PathLike} dir
   * @returns {Promise<string|undefined>}
   */
  async mkdirp(dir) {
    return await fs.mkdir(dir, {recursive: true});
  },

  /**
   * Walks a directory given according to the parameters given. The callback will be invoked with a path joined with the dir parameter
   * @param {string} dir Directory path where we will start walking
   * @param {boolean} recursive Set it to true if you want to continue walking sub directories
   * @param {WalkDirCallback} callback The callback to be called when a new path is found
   * @throws {Error} If the `dir` parameter contains a path to an invalid folder
   * @returns {Promise<string?>} returns the found path or null if the item was not found
   */
  // eslint-disable-next-line promise/prefer-await-to-callbacks
  async walkDir(dir, recursive, callback) {
    let isValidRoot = false;
    let errMsg = null;
    try {
      isValidRoot = (await fs.stat(dir)).isDirectory();
    } catch (e) {
      errMsg = e.message;
    }
    if (!isValidRoot) {
      throw Error(
        `'${dir}' is not a valid root directory` + (errMsg ? `. Original error: ${errMsg}` : '')
      );
    }

    let walker;
    let fileCount = 0;
    let directoryCount = 0;
    const timer = new Timer().start();
    return await new B(function (resolve, reject) {
      let lastFileProcessed = B.resolve();
      walker = klaw(dir, {
        depthLimit: recursive ? -1 : 0,
      });
      walker
        .on('data', function (item) {
          walker.pause();

          if (!item.stats.isDirectory()) {
            fileCount++;
          } else {
            directoryCount++;
          }

          // eslint-disable-next-line promise/prefer-await-to-callbacks
          lastFileProcessed = B.try(async () => await callback(item.path, item.stats.isDirectory()))
            .then(function (done = false) {
              if (done) {
                resolve(item.path);
              } else {
                walker.resume();
              }
            })
            .catch(reject);
        })
        .on('error', function (err, item) {
          log.warn(`Got an error while walking '${item.path}': ${err.message}`);
          // klaw cannot get back from an ENOENT error
          if (err.code === 'ENOENT') {
            log.warn('All files may not have been accessed');
            reject(err);
          }
        })
        .on('end', function () {
          lastFileProcessed
            .then((file) => {
              resolve(/** @type {string|undefined} */ (file) ?? null);
            })
            .catch(function (err) {
              log.warn(`Unexpected error: ${err.message}`);
              reject(err);
            });
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
  },
  /**
   * Reads the closest `package.json` file from absolute path `dir`.
   * @param {string} dir - Directory to search from
   * @param {import('read-pkg').Options} [opts] - Additional options for `read-pkg`
   * @throws {Error} If there were problems finding or reading a `package.json` file
   * @returns {import('read-pkg').NormalizedPackageJson} A parsed `package.json`
   */
  readPackageJsonFrom(dir, opts = {}) {
    const cwd = fs.findRoot(dir);
    try {
      return readPkg.sync(
        /** @type {import('read-pkg').NormalizeOptions} */ ({normalize: true, ...opts, cwd})
      );
    } catch (err) {
      err.message = `Failed to read a \`package.json\` from dir \`${dir}\`:\n\n${err.message}`;
      throw err;
    }
  },
  /**
   * Finds the project root directory from `dir`.
   * @param {string} dir - Directory to search from
   * @throws {TypeError} If `dir` is not a nonempty string or relative path
   * @throws {Error} If there were problems finding the project root
   * @returns {string} The closeset parent dir containing `package.json`
   */
  findRoot(dir) {
    if (!dir || !path.isAbsolute(dir)) {
      throw new TypeError('`findRoot()` must be provided a non-empty, absolute path');
    }
    const result = findRootCached(dir);
    if (!result) {
      throw new Error(`\`findRoot()\` could not find \`package.json\` from ${dir}`);
    }
    return result;
  },

  // add the supported `fs` functions
  access: fsPromises.access,
  appendFile: fsPromises.appendFile,
  chmod: fsPromises.chmod,
  close: B.promisify(close),
  constants,
  createWriteStream,
  createReadStream,
  lstat: fsPromises.lstat,
  /**
   * Warning: this is a promisified {@linkcode open fs.open}.
   * It resolves w/a file descriptor instead of a {@linkcode fsPromises.FileHandle FileHandle} object, as {@linkcode fsPromises.open} does. Use {@linkcode fs.openFile} if you want a `FileHandle`.
   * @type {(path: PathLike, flags: import('fs').OpenMode, mode?: import('fs').Mode) => Promise<number>}
   */
  open: B.promisify(open),
  openFile: fsPromises.open,
  readdir: fsPromises.readdir,

  read: /**
   * @type {ReadFn<NodeJS.ArrayBufferView>}
   */ (/** @type {unknown} */ (B.promisify(read))),
  readFile: fsPromises.readFile,
  readlink: fsPromises.readlink,
  realpath: fsPromises.realpath,
  rename: fsPromises.rename,
  stat: fsPromises.stat,
  symlink: fsPromises.symlink,
  unlink: fsPromises.unlink,
  write: B.promisify(write),
  writeFile: fsPromises.writeFile,

  // deprecated props

  /**
   * Use `constants.F_OK` instead.
   * @deprecated
   */
  F_OK: constants.F_OK,

  /**
   * Use `constants.R_OK` instead.
   * @deprecated
   */
  R_OK: constants.R_OK,

  /**
   * Use `constants.W_OK` instead.
   * @deprecated
   */
  W_OK: constants.W_OK,

  /**
   * Use `constants.X_OK` instead.
   * @deprecated
   */
  X_OK: constants.X_OK,
};

export {fs};
export default fs;

/**
 * The callback function which will be called during the directory walking
 * @callback WalkDirCallback
 * @param {string} itemPath The path of the file or folder
 * @param {boolean} isDirectory Shows if it is a directory or a file
 * @return {boolean|void} return true if you want to stop walking
 */

/**
 * @typedef {import('glob')} glob
 * @typedef {import('mv')} mv
 * @typedef {import('fs').PathLike} PathLike
 */

/**
 * @template {NodeJS.ArrayBufferView} TBuffer
 * @callback ReadFn
 * @param {number} fd
 * @param {TBuffer|import('node:fs').ReadAsyncOptions<TBuffer>} buffer
 * @param {number} [offset]
 * @param {number} [length]
 * @param {number?} [position]
 * @returns {B<{bytesRead: number, buffer: TBuffer}>}
 */
