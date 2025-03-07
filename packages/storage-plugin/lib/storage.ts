import { fs, timing } from '@appium/support';
import _ from 'lodash';
import B from 'bluebird';
import type { Path } from 'path-scurry';
import path from 'node:path';
import type { Stats } from 'node:fs';
import nativeFs from 'node:fs';
import { rimrafSync } from 'rimraf';
import { ItemOptions, StorageItem } from './types';
import AsyncLock from 'async-lock';
import type { AppiumLogger } from '@appium/types';
import type Stream from 'node:stream';
import type WebSocket from 'ws';

const MAX_TASKS = 5;
const TMP_EXT = '.filepart';
const ADDITION_LOCK = new AsyncLock();
const WS_SERVER_ERROR = 1011;
const SHA1_HASH_LEN = 40;


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

  async add(opts: ItemOptions, source: Stream | WebSocket): Promise<void> {
    const {name} = requireValidItemOptions(opts);
    await ADDITION_LOCK.acquire(name, async () => {
      if (_.isFunction((source as any).pipe)) {
        await this._addFromStream(opts, source as Stream);
      } else {
        await this._addFromWebSocket(opts, source as WebSocket);
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

  private async _addFromStream(opts: ItemOptions, source: Stream): Promise<void> {
    const {name} = opts;
    const fullPath = path.join(this._root, toTempName(name));
    const inProgressInfo: InProgressAddition = {fullPath};
    this._inProgressAdditions[name] = inProgressInfo;
    try {
      const timer = new timing.Timer().start();
      const destination = fs.createWriteStream(fullPath);
      source.pipe(destination);
      try {
        await new Promise((resolve, reject) => {
          destination.once('finish', () => resolve(true));
          source.once('error', reject);
          destination.once('error', reject);
        });
        await this._finalizeItem(opts, timer, fullPath);
      } catch (e) {
        await fs.rimraf(fullPath);
        throw e;
      }
    } finally {
      delete this._inProgressAdditions[name];
    }
  }

  private async _addFromWebSocket(opts: ItemOptions, source: WebSocket): Promise<void> {
    const {name} = opts;
    const fullPath = path.join(this._root, toTempName(name));
    const inProgressInfo: InProgressAddition = {fullPath};
    this._inProgressAdditions[name] = inProgressInfo;
    try {
      const timer = new timing.Timer().start();
      const destination = fs.createWriteStream(fullPath);
      try {
        await new Promise((resolve, reject) => {
          source.on('message', (data: WebSocket.RawData) => {
            destination.write(data, (e) => {
              if (e) {
                source.close(WS_SERVER_ERROR);
                reject(e);
              }
            });
          });
          source.once('close', () => {
            destination.close(() => resolve(true));
          });
          source.once('error', reject);
          destination.once('error', (e) => {
            source.close(WS_SERVER_ERROR);
            reject(e);
          });
        });
        await this._finalizeItem(opts, timer, fullPath);
      } catch (e) {
        await fs.rimraf(fullPath);
        throw e;
      }
    } finally {
      delete this._inProgressAdditions[name];
    }
  }

  private async _finalizeItem(opts: ItemOptions, timer: timing.Timer, fullPath: string): Promise<void> {
    const {name, hash} = opts;
    this._log.info(
      `The addition of '${name}' is completed within ` +
      `${timer.getDuration().asMilliSeconds}ms. Verifying hashes.`
    );
    const actualHash = await fs.hash(fullPath);
    if (_.toLower(actualHash) !== _.toLower(hash)) {
      throw new StorageArgumentError(
        `The actual hash value '${actualHash}' must be equal ` +
        `to the expected hash value of '${hash}' for '${name}'`
      );
    }
    await fs.mv(fullPath, path.join(this._root, name));
    this._knownNames.add(name);
  }
}

function toTempName(origName: string): string {
  return `${origName}${TMP_EXT}`;
}

export function requireValidItemOptions(opts: ItemOptions): ItemOptions {
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
  if (!_.isString(opts.hash) || opts.hash.length !== SHA1_HASH_LEN) {
    throw new StorageArgumentError(
      `The provided hash value '${opts.hash}' must be a valid SHA1 string, for ` +
      `example 'ccc963411b2621335657963322890305ebe96186'`
    );
  }
  return opts;
}

interface InProgressAddition {
  fullPath: string;
}

export class StorageArgumentError extends Error {}
