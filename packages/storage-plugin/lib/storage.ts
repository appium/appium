import { fs, util } from '@appium/support';
import _ from 'lodash';
import B from 'bluebird';
import type { Path } from 'path-scurry';
import path from 'node:path';
import type { Stats } from 'node:fs';
import nativeFs from 'node:fs';
import { rimrafSync } from 'rimraf';
import { FileChunkOptions, StorageItem } from './types';
import AsyncLock from 'async-lock';
import type { FileHandle } from 'node:fs/promises';
import type { AppiumLogger } from '@appium/types';

const MAX_TASKS = 5;
const TMP_EXT = '.filepart';
const BUFFER_SIZE = 0xFFFF;
// 512 KB
const MAX_CHUNK_SIZE = 512 * 1024;
const ADDITION_LOCK = new AsyncLock();


export class Storage {
  private readonly _root: string;
  private readonly _log: AppiumLogger;
  private readonly _shouldPreserveRoot: boolean;
  private readonly _shouldKeepKnownItems: boolean;
  private readonly _knownNames = new Set<string>();
  private _inProgressAdditions: Record<string, InProgressAddition> = {};

  constructor(
    root: string,
    shouldPreserveRoot: boolean,
    shouldKeepItems: boolean,
    log: AppiumLogger,
  ) {
    this._root = root;
    this._log = log;
    this._shouldPreserveRoot = shouldPreserveRoot;
    this._shouldKeepKnownItems = shouldKeepItems;
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
    requireValidOptions(opts);
    await ADDITION_LOCK.acquire(opts.name, async () => {
      if (opts.name in this._inProgressAdditions) {
        const additionInfo = this._inProgressAdditions[opts.name];
        await this._handleExistingItem(
          additionInfo,
          requireValidOptions(opts, additionInfo),
        );
      } else {
        await this._handleNewItem(opts);
      }
    });
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
    if (!this._shouldPreserveRoot && !this._shouldKeepKnownItems) {
      await fs.rimraf(this._root);
    }

    if (!await fs.exists(this._root)) {
      await fs.mkdirp(this._root);
      return;
    }

    const namesInProgress = new Set<string>(
      _.values(this._inProgressAdditions)
      .map(({fullPath}) => path.basename(fullPath))
    );
    this._inProgressAdditions = {};

    const files = (await this._listFiles())
      .map((p) => p.fullpath())
      .filter((fullPath) => {
        const basename = path.basename(fullPath);
        return (!this._shouldKeepKnownItems && this._knownNames.has(basename))
          || namesInProgress.has(basename);
      });
    if (_.isEmpty(files)) {
      if (!this._shouldKeepKnownItems) {
        this._knownNames.clear();
      }
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
    if (!this._shouldKeepKnownItems) {
      this._knownNames.clear();
    }
  }

  cleanupSync(): void {
    this._log.debug(`Cleaning up the '${this._root}' server storage folder`);

    if (!this._shouldPreserveRoot && !this._shouldKeepKnownItems) {
      rimrafSync(this._root);
      return;
    }

    const namesInProgress = new Set<string>(
      _.values(this._inProgressAdditions)
      .map(({fullPath}) => path.basename(fullPath))
    );
    this._inProgressAdditions = {};
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
      if (!this._shouldPreserveRoot) {
        rimrafSync(this._root);
      }
      if (!this._shouldKeepKnownItems) {
        this._knownNames.clear();
      }
      return;
    }

    const matchedNames = itemNames.filter(
      (name) => (!this._shouldKeepKnownItems && this._knownNames.has(name)) || namesInProgress.has(name)
    );
    for (const matchedName of matchedNames) {
      rimrafSync(path.join(this._root, matchedName));
    }
    if (!this._shouldKeepKnownItems) {
      this._knownNames.clear();
    }
    if (!this._shouldPreserveRoot && _.isEmpty(_.without(itemNames, ...matchedNames))) {
      rimrafSync(this._root);
    }
  }

  private async _listFiles(): Promise<Path[]> {
    const paths = (await fs.glob('*', {
      cwd: this._root,
      withFileTypes: true,
    })) as unknown as Path[];
    return paths.filter((item) => item.isFile());
  }

  private async _handleExistingItem(
    additionInfo: InProgressAddition,
    opts: FileChunkOptions,
  ): Promise<void> {
    const fhandle = await fs.openFile(additionInfo.fullPath, 'w');
    await this._writeChunk(fhandle, additionInfo, opts);
  }

  private async _handleNewItem(opts: FileChunkOptions): Promise<void> {
    this._log.info(`Handling a new storage item addition: ${formatForLogs(opts)}`);
    const fullPath = path.join(this._root, toTempName(requireValidOptions(opts).name));
    const inProgressInfo: InProgressAddition = {
      totalSize: opts.size,
      hash: opts.hash,
      currentSize: 0,
      fullPath,
    };
    const fhandle = await createDummyFile(inProgressInfo.fullPath, inProgressInfo.totalSize);
    this._inProgressAdditions[opts.name] = inProgressInfo;
    await this._writeChunk(fhandle, inProgressInfo, opts);
  }

  private async _writeChunk(
    fhandle: FileHandle,
    additionInfo: InProgressAddition,
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
      additionInfo.currentSize += buffer.length;
    } finally {
      await fhandle.close();
    }
    if (additionInfo.currentSize < additionInfo.totalSize) {
      return;
    }

    this._log.info(
      `The addition of ${formatForLogs(opts)} seem to have finsihed. Verifying hashes.`
    );
    const actualHash = await fs.hash(additionInfo.fullPath);
    if (_.toLower(actualHash) !== _.toLower(additionInfo.hash)) {
      throw new StorageArgumentError(
        `The actual hash value '${actualHash}' must be equal ` +
        `to the expected hash value of '${additionInfo.hash}' ` +
        `for '${opts.name}'. ` +
        `Please verify if all file parts have been suplied properly`
      );
    }
    await fs.mv(additionInfo.fullPath, path.join(this._root, opts.name));
    if (opts.name in this._inProgressAdditions) {
      delete this._inProgressAdditions[opts.name];
    }
    this._knownNames.add(opts.name);
  }
}

function toTempName(origName: string): string {
  return `${origName}${TMP_EXT}`;
}

function formatForLogs(opts: FileChunkOptions): string {
  return JSON.stringify({
    name: opts.name,
    size: opts.size,
  });
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

function requireValidOptions(opts: FileChunkOptions, additionInfo?: InProgressAddition): FileChunkOptions {
  if (additionInfo) {
    if (additionInfo.totalSize !== opts.size) {
      throw new StorageArgumentError(
        `The provided size value '${opts.size}' must be the same ` +
        `as the initial size value of '${additionInfo.totalSize}' ` +
        `for '${opts.name}'`
      );
    }
    if (_.toLower(additionInfo.hash) !== _.toLower(opts.hash)) {
      throw new StorageArgumentError(
        `The provided hash value '${opts.hash}' must be the same ` +
        `as the inital hash value '${additionInfo.hash}' ` +
        `for '${opts.name}'`
      );
    }
    return opts;
  }

  if (_.isEmpty(opts.name)) {
    throw new StorageArgumentError(`The provided file name '${opts.name}' must not be empty`);
  }
  const sanitizedName = fs.sanitizeName(opts.name, {
    replacement: '_',
  });
  if (opts.name !== sanitizedName) {
    throw new StorageArgumentError(
      `The provided name value '${opts.name}' must be a valid file name. ` +
      `Did you mean '${sanitizedName}'?`
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
  if (opts.position >= opts.size) {
    throw new StorageArgumentError(
      `The provided file position '${opts.position}' must be less than the file size (${opts.size})`
    );
  }
  if (_.isEmpty(opts.chunk)) {
    throw new StorageArgumentError(`The provided chunk must not be empty`);
  }
  return opts;
}

interface InProgressAddition {
  totalSize: number;
  currentSize: number;
  hash: string;
  fullPath: string;
}

export class StorageArgumentError extends Error {}
