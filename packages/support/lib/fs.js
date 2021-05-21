// jshint ignore: start
import _fs from 'fs';
import rimraf from 'rimraf';
import ncp from 'ncp';
import B from 'bluebird';
import mv from 'mv';
import which from 'which';
import glob from 'glob';
import crypto from 'crypto';
import klaw from 'klaw';
import sanitize from 'sanitize-filename';
import { pluralize } from './util';
import log from './logger';
import Timer from './timing';

const mkdirAsync = B.promisify(_fs.mkdir);
const ncpAsync = B.promisify(ncp);

const fs = {
  async hasAccess (path) {
    try {
      await this.access(path, _fs.R_OK);
    } catch (err) {
      return false;
    }
    return true;
  },
  exists (path) { return this.hasAccess(path); },
  rimraf: B.promisify(rimraf),
  rimrafSync: rimraf.sync.bind(rimraf),
  async mkdir (...args) {
    try {
      return await mkdirAsync(...args);
    } catch (err) {
      if (err && err.code !== 'EEXIST') {
        throw err;
      }
    }
  },
  async copyFile (source, destination, ...otherArgs) {
    if (!await this.hasAccess(source)) {
      throw new Error(`The file at '${source}' does not exist or is not accessible`);
    }
    return await ncpAsync(source, destination, ...otherArgs);
  },
  async md5 (filePath) {
    return await this.hash(filePath, 'md5');
  },
  mv: B.promisify(mv),
  which: B.promisify(which),
  glob: B.promisify(glob),
  sanitizeName: sanitize,
  async hash (filePath, algorithm = 'sha1') {
    return await new B((resolve, reject) => {
      const fileHash = crypto.createHash(algorithm);
      const readStream = _fs.createReadStream(filePath);
      readStream.on('error', (e) => reject(
        new Error(`Cannot calculate ${algorithm} hash for '${filePath}'. Original error: ${e.message}`)));
      readStream.on('data', (chunk) => fileHash.update(chunk));
      readStream.on('end', () => resolve(fileHash.digest('hex')));
    });
  },
  /** The callback function which will be called during the directory walking
   * @name WalkDirCallback
   * @function
   * @param {string} itemPath The path of the file or folder
   * @param {boolean} isDirectory Shows if it is a directory or a file
   * @return {boolean} return true if you want to stop walking
  */

  /**
   * Walks a directory given according to the parameters given. The callback will be invoked with a path joined with the dir parameter
   * @param {string} dir Directory path where we will start walking
   * @param {boolean} recursive Set it to true if you want to continue walking sub directories
   * @param {WalkDirCallback} callback The callback to be called when a new path is found
   * @throws {Error} If the `dir` parameter contains a path to an invalid folder
   * @return {?string} returns the found path or null if the item was not found
   */
  async walkDir (dir, recursive, callback) { //eslint-disable-line promise/prefer-await-to-callbacks
    let isValidRoot = false;
    let errMsg = null;
    try {
      isValidRoot = (await fs.stat(dir)).isDirectory();
    } catch (e) {
      errMsg = e.message;
    }
    if (!isValidRoot) {
      throw Error(`'${dir}' is not a valid root directory` + (errMsg ? `. Original error: ${errMsg}` : ''));
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
      walker.on('data', function (item) {
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
          .then(resolve)
          .catch(function (err) {
            log.warn(`Unexpected error: ${err.message}`);
            reject(err);
          });
      });
    }).finally(function () {
      log.debug(`Traversed ${pluralize('directory', directoryCount, true)} ` +
        `and ${pluralize('file', fileCount, true)} ` +
        `in ${timer.getDuration().asMilliSeconds.toFixed(0)}ms`);
      if (walker) {
        walker.destroy();
      }
    });
  }
};

// add the supported `fs` functions
const simples = [
  'open', 'close', 'access', 'readFile', 'writeFile', 'write', 'read',
  'readlink', 'chmod', 'unlink', 'readdir', 'stat', 'rename', 'lstat',
  'appendFile', 'realpath', 'symlink',
];
for (const s of simples) {
  fs[s] = B.promisify(_fs[s]);
}

const syncFunctions = [
  'createReadStream',
  'createWriteStream',
];
for (const s of syncFunctions) {
  fs[s] = _fs[s];
}

// add the constants from `fs`
const constants = [
  'F_OK', 'R_OK', 'W_OK', 'X_OK', 'constants',
];
for (const c of constants) {
  fs[c] = _fs[c];
}

export { fs };
export default fs;
