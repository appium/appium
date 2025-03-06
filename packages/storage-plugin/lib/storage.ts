import { fs, util } from '@appium/support';
import _ from 'lodash';
import B from 'bluebird';
import type { Path } from 'path-scurry';
import path from 'node:path';
import type { Stats } from 'node:fs';
import nativeFs from 'node:fs';
import { rimrafSync } from 'rimraf';
import { FileChunkOpts as FileChunkOptions, StorageItem } from './types';
import AsyncLock from 'async-lock';
import type { FileHandle } from 'node:fs/promises';
import type { AppiumLogger } from '@appium/types';

const MAX_TASKS = 5;
const TMP_EXT = '.filepart';
const BUFFER_SIZE = 0xFFFF;
// 100 KB
const MAX_CHUNK_SIZE = 100 * 1024;


export class Storage {
  private readonly _root: string;
  private readonly _log: AppiumLogger;
  private readonly _shouldPreserveRoot: boolean;
  private readonly _knownNames = new Set<string>();
  private _inProgressUploads: Record<string, InProgressUpload> = {};

  constructor(root: string, shouldPreserveRoot: boolean, log: AppiumLogger) {
    this._root = root;
    this._log = log;
    this._shouldPreserveRoot = shouldPreserveRoot;
  }

  async list(): Promise<StorageItem[]> {
    const items = (await this._listFiles())
      .filter((p) => this._knownNames.has(path.basename(p.fullpath())));
    if (_.isEmpty(items)) {
      return [];
    }

    const statPromises: B<Stats>[] = [];
    for (const item of items) {
      const pending = statPromises.filter((p) => p.isPending());
      if (pending.length >= MAX_TASKS) {
        await B.any(pending);
      }
      statPromises.push(B.resolve(fs.stat(item.fullpath())));
    }
    return _.zip(
      items.map((f) => f.fullpath()),
      await B.all(statPromises)
    )
    .map(([fullpath, stat]) => ({
      name: path.basename(fullpath as string),
      path: fullpath as string,
      size: (stat as Stats).size,
    }));
  }

  async addChunk(opts: FileChunkOptions): Promise<void> {
    if (opts.name in this._inProgressUploads) {
      await this._handleExistingUpload(this._inProgressUploads[opts.name], opts);
    } else {
      await this._handleNewUpload(opts);
    }
  }

  async delete(name: string): Promise<boolean> {
    if (!this._knownNames.has(name)) {
      return false;
    }
    const destinationPath = path.join(this._root, name);
    if (!await fs.exists(destinationPath)) {
      return false;
    }
    await fs.rimraf(destinationPath);
    this._knownNames.delete(name);
    return true;
  }

  async reset(): Promise<void> {
    if (!this._shouldPreserveRoot) {
      await fs.rimraf(this._root);
    }

    if (!await fs.exists(this._root)) {
      await fs.mkdirp(this._root);
      return;
    }

    const namesInProgress = new Set<string>(
      _.values(this._inProgressUploads)
      .map(({fullPath}) => path.basename(fullPath))
    );
    this._inProgressUploads = {};

    const files = (await this._listFiles())
      .map((p) => p.fullpath())
      .filter((fullPath) => {
        const basename = path.basename(fullPath);
        return this._knownNames.has(basename) || namesInProgress.has(basename);
      });
    if (_.isEmpty(files)) {
      this._knownNames.clear();
      return;
    }

    const promises: B<any>[] = [];
    for (const fullPath of files) {
      const pending = promises.filter((p) => p.isPending());
      if (pending.length >= MAX_TASKS) {
        await B.any(pending);
      }
      promises.push(B.resolve(fs.rimraf(fullPath)));
    }
    await B.all(promises);
    this._knownNames.clear();
  }

  cleanupSync(): void {
    this._log.debug(`Cleaning up the '${this._root}' server storage folder`);

    if (!this._shouldPreserveRoot) {
      rimrafSync(this._root);
      return;
    }

    const namesInProgress = new Set<string>(
      _.values(this._inProgressUploads)
      .map(({fullPath}) => path.basename(fullPath))
    );
    this._inProgressUploads = {};
    let itemNames: string[];
    try {
      itemNames = nativeFs.readdirSync(this._root)
        .filter((name) => !_.startsWith(name, '.'));
    } catch (e) {
      this._log.warn(
        `Cannot list the '${this._root}' server storage folder, original error: ${e.message}. ` +
        `Skipping the cleanup.`
      );
      return;
    }
    if (_.isEmpty(itemNames)) {
      this._knownNames.clear();
      return;
    }

    const matchedNames = itemNames
      .filter((name) => this._knownNames.has(name) || namesInProgress.has(name));
    if (_.isEmpty(matchedNames)) {
      return;
    }
    if (_.isEqual(matchedNames, itemNames)) {
      rimrafSync(this._root);
    } else {
      for (const matchedName of matchedNames) {
        rimrafSync(path.join(this._root, matchedName));
      }
    }
    this._knownNames.clear();
  }

  private async _listFiles(): Promise<Path[]> {
    const paths = (await fs.glob('*', {
      cwd: this._root,
      withFileTypes: true,
    })) as unknown as Path[];
    return paths.filter((item) => item.isFile());
  }

  private async _handleExistingUpload(
    uploadInfo: InProgressUpload,
    opts: FileChunkOptions,
  ): Promise<void> {
    const validatedOpts = requireValidOptions(opts);
    await uploadInfo.lock.acquire(opts.name, async () => {
      const fhandle = await fs.openFile(uploadInfo.fullPath, 'w');
      await this._writeChunk(fhandle, uploadInfo, validatedOpts);
    });
  }

  private async _handleNewUpload(opts: FileChunkOptions): Promise<void> {
    this._log.info(`Handling a new file upload: ${JSON.stringify(_.omit(opts, 'chunk', 'position'))}`);
    const fullPath = path.join(this._root, toTempName(requireValidOptions(opts).name));
    const inProgressInfo: InProgressUpload = {
      lock: new AsyncLock(),
      totalSize: opts.size,
      hash: opts.hash,
      currentSize: 0,
      fullPath,
    };
    this._inProgressUploads[opts.name] = inProgressInfo;
    await inProgressInfo.lock.acquire(opts.name, async () => {
      const fhandle = await createDummyFile(inProgressInfo.fullPath, inProgressInfo.totalSize);
      await this._writeChunk(fhandle, inProgressInfo, opts);
    });
  }

  private async _writeChunk(
    fhandle: FileHandle,
    uploadInfo: InProgressUpload,
    opts: FileChunkOptions,
  ): Promise<void> {
    const buffer = Buffer.from(opts.chunk, 'base64');
    if (buffer.length > MAX_CHUNK_SIZE) {
      throw new StorageArgumentError(
        `The provided chunk length (${util.toReadableSizeString(buffer.length)}) must be ` +
        `below ${util.toReadableSizeString(MAX_CHUNK_SIZE)}`
      );
    }
    try {
      await fhandle.write(buffer, 0, buffer.length, opts.position);
      uploadInfo.currentSize += buffer.length;
    } finally {
      await fhandle.close();
    }
    if (uploadInfo.currentSize >= uploadInfo.totalSize) {
      this._log.info(
        `The upload of ${JSON.stringify(_.omit(opts, 'chunk', 'position'))} ` +
        `seem to have finsihed. Verifying hashes.`
      );
      const actualHash = await fs.hash(uploadInfo.fullPath);
      if (_.toLower(actualHash) !== _.toLower(uploadInfo.hash)) {
        throw new StorageArgumentError(
          `The actual hash value '${actualHash}' must be equal ` +
          `to the expected hash value of '${uploadInfo.hash}' ` +
          `for '${opts.name}'. ` +
          `Please verify if all file parts have been suplied properly`
        );
      }
      await fs.mv(uploadInfo.fullPath, path.join(this._root, opts.name));
      if (opts.name in this._inProgressUploads) {
        delete this._inProgressUploads[opts.name];
      }
      this._knownNames.add(opts.name);
    }
  }
}

function toTempName(origName: string): string {
  return `${origName}${TMP_EXT}`;
}

export async function createDummyFile(filePath: string, size: number): Promise<FileHandle> {
  const fhandle = await fs.openFile(filePath, 'w');
  let bytesWritten = 0;
  while (bytesWritten < size) {
    const bufferSize = Math.min(BUFFER_SIZE, size - bytesWritten);
    try {
      await fhandle.write(Buffer.alloc(bufferSize), 0, bufferSize, bytesWritten);
    } catch (e) {
      await fhandle.close();
      await fs.rimraf(filePath);
      throw e;
    }
    bytesWritten += bufferSize;
  }
  return fhandle;
}

function requireValidOptions(opts: FileChunkOptions, uploadInfo?: InProgressUpload): FileChunkOptions {
  if (_.includes(opts.name, path.sep)) {
    throw new StorageArgumentError(
      `The provided file name '${opts.name}' must not contain any ` +
      `path separators`
    );
  }
  if (opts.size <= 0) {
    throw new StorageArgumentError(
      `The provided file size '${opts.size}' must be greater than zero`
    );
  }
  if (opts.position < 0) {
    throw new StorageArgumentError(
      `The provided file position '${opts.position}' must be greater or equal to zero`
    );
  }
  if (_.isEmpty(opts.chunk)) {
    throw new StorageArgumentError(`The provided chunk must not be empty`);
  }
  if (!uploadInfo) {
    return opts;
  }

  if (uploadInfo.totalSize !== opts.size) {
    throw new StorageArgumentError(
      `The provided size value '${opts.size}' must be equal ` +
      `to the expected size value of '${uploadInfo.totalSize}' ` +
      `for '${opts.name}'`
    );
  }
  if (_.toLower(uploadInfo.hash) !== _.toLower(opts.hash)) {
    throw new StorageArgumentError(
      `The provided hash value '${opts.hash}' must be equal ` +
      `to the expected hash value of '${uploadInfo.hash}' ` +
      `for '${opts.name}'`
    );
  }
  return opts;
}

interface InProgressUpload {
  lock: AsyncLock;
  totalSize: number;
  currentSize: number;
  hash: string;
  fullPath: string;
}

class StorageArgumentError extends Error {}
