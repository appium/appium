import { fs } from 'appium/support';
import _ from 'lodash';
import B from 'bluebird';
import type { Path } from 'path-scurry';
import path from 'node:path';
import type { Dirent, Stats } from 'node:fs';
import { rimrafSync } from 'rimraf';
import { FileChunkOpts as FileChunkOptions } from './types';
import AsyncLock from 'async-lock';
import type { FileHandle } from 'node:fs/promises';
import type { AppiumLogger } from '@appium/types';

const MAX_RESET_TASKS = 5;
const TMP_EXT = '.filepart';
const BUFFER_SIZE = 0xFFFF;

export class Storage {
  private readonly _root: string;
  private readonly _log: AppiumLogger;
  private readonly _shouldPreserveRoot: boolean;
  private _inProgressUploads: Record<string, InProgressUpload> = {};

  constructor(root: string, shouldPreserveRoot: boolean, log: AppiumLogger) {
    this._root = root;
    this._log = log;
    this._shouldPreserveRoot = shouldPreserveRoot;
  }

  async list(): Promise<Path[]> {
    const files = await this._listFiles();
    return files.filter((p) => !_.endsWith(p.fullpath(), TMP_EXT));
  }

  async addChunk(opts: FileChunkOptions): Promise<void> {
    if (_.includes(opts.name, path.sep)) {
      throw new StorageArgumentError(
        `The provided file name '${opts.name}' must not contain any ` +
        `path separators`
      );
    }
    if (opts.name in this._inProgressUploads) {
      await this._handleExistingUpload(this._inProgressUploads[opts.name], opts);
    } else {
      await this._handleNewUpload(opts);
    }
  }

  async delete(name: string): Promise<boolean> {
    const destinationPath = path.join(this._root, name);
    if (!await fs.exists(destinationPath)) {
      return false;
    }
    await fs.rimraf(destinationPath);
    return true;
  }

  async reset(): Promise<void> {
    if (!await fs.exists(this._root)) {
      await fs.mkdirp(this._root);
    }

    this._inProgressUploads = {};

    const files = (await this._listFiles())
      .map((item) => item.fullpath());
    if (_.isEmpty(files)) {
      return;
    }

    const promises: B<any>[] = [];
    for (const fullPath of files) {
      if (promises.length >= MAX_RESET_TASKS) {
        await B.any(promises);
      }
      _.remove(promises, (p) => p.isFulfilled());
      promises.push(B.resolve(fs.rimraf(fullPath)));
    }
    await B.all(promises);
  }

  cleanupSync(): void {
    this._log.debug(`Cleaning up all files from the '${this._root}' server storage folder`);

    this._inProgressUploads = {};

    rimrafSync(this._root, {
      preserveRoot: this._shouldPreserveRoot,
      filter: (path: string, ent: Dirent | Stats) => ent.isFile(),
    });
  }

  private async _listFiles(): Promise<Path[]> {
    const paths = (await fs.glob('*', {
      cwd: this._root,
      absolute: true,
      withFileTypes: true,
    })) as unknown as Path[];
    return paths.filter((item) => item.isFile());
  }

  private async _handleExistingUpload(
    uploadInfo: InProgressUpload,
    opts: FileChunkOptions,
  ): Promise<void> {
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
    await uploadInfo.lock.acquire(this.constructor.name, async () => {
      const fhandle = await fs.openFile(uploadInfo.fullPath, 'w');
      await this._writeChunk(fhandle, uploadInfo, opts);
    });
  }

  private async _handleNewUpload(opts: FileChunkOptions): Promise<void> {
    this._log.info(`Handling a new file upload: ${JSON.stringify(_.omit(opts, 'chunk', 'position'))}`);
    const fullPath = path.join(this._root, toTempName(opts.name));
    const inProgressInfo: InProgressUpload = {
      lock: new AsyncLock(),
      totalSize: opts.size,
      hash: opts.hash,
      currentSize: 0,
      fullPath,
    };
    this._inProgressUploads[opts.name] = inProgressInfo;
    await inProgressInfo.lock.acquire(this.constructor.name, async () => {
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
          `for '${opts.name}'`
        );
      }
      await fs.mv(uploadInfo.fullPath, path.join(this._root, opts.name));
      delete this._inProgressUploads[opts.name];
    }
  }
}

function toTempName(origName: string): string {
  return `${origName}${TMP_EXT}`;
}

async function createDummyFile(filePath: string, size: number): Promise<FileHandle> {
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

interface InProgressUpload {
  lock: AsyncLock;
  totalSize: number;
  currentSize: number;
  hash: string;
  fullPath: string;
}

class StorageArgumentError extends Error {}
