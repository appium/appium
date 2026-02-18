import { fs, timing } from '@appium/support';
import _ from 'lodash';
import { asyncmap } from 'asyncbox';
import type { Path } from 'path-scurry';
import path from 'node:path';
import type { Stats } from 'node:fs';
import nativeFs from 'node:fs';
import { ItemOptions, StorageItem } from './types';
import AsyncLock from 'async-lock';
import type { AppiumLogger } from '@appium/types';
import type Stream from 'node:stream';
import type WebSocket from 'ws';
import { createHash } from 'node:crypto';

const MAX_TASKS = 5;
const TMP_EXT = '.filepart';
const ADDITION_LOCK = new AsyncLock();
const WS_SERVER_ERROR = 1011;
const SHA1_HASH_LEN = 40;


export class Storage {
  private readonly _root: string;
  private readonly _log: AppiumLogger;
  private readonly _shouldPreserveRoot: boolean;
  private readonly _shouldPreserveFiles: boolean;

  constructor(
    root: string,
    shouldPreserveRoot: boolean,
    shouldPreserveFiles: boolean,
    log: AppiumLogger,
  ) {
    this._root = root;
    this._log = log;
    this._shouldPreserveRoot = shouldPreserveRoot;
    this._shouldPreserveFiles = shouldPreserveFiles;
  }

  async list(): Promise<StorageItem[]> {
    const items = (await this._listFiles())
      .filter((p) => !p.fullpath().endsWith(TMP_EXT));
    if (_.isEmpty(items)) {
      return [];
    }

    const stats = await asyncmap(
      items,
      (item) => fs.stat(item.fullpath()),
      {concurrency: MAX_TASKS}
    );
    return _.zip(
      items.map((f) => f.fullpath()),
      stats
    )
    .map(([fullpath, stat]) => ({
      name: path.basename(fullpath as string),
      path: fullpath as string,
      size: (stat as Stats).size,
    }));
  }

  async add(opts: ItemOptions, source: Stream | WebSocket): Promise<void> {
    const {name} = requireValidItemOptions(opts);
    // _.toLower is needed for case-insensitive server filesystems
    await ADDITION_LOCK.acquire(_.toLower(name), async () => {
      if (_.isFunction((source as any).pipe)) {
        await this._addFromStream(opts, source as Stream);
      } else {
        await this._addFromWebSocket(opts, source as WebSocket);
      }
    });
  }

  async delete(name: string): Promise<boolean> {
    if (_.toLower(name).endsWith(TMP_EXT)) {
      return false;
    }
    const destinationPath = path.join(this._root, name);
    if (!await fs.exists(destinationPath)) {
      return false;
    }
    await fs.rimraf(destinationPath);
    return true;
  }

  async reset(): Promise<void> {
    if (!this._shouldPreserveRoot && !this._shouldPreserveFiles) {
      await fs.rimraf(this._root);
    }

    if (!await fs.exists(this._root)) {
      await fs.mkdirp(this._root);
      return;
    }

    const files = (await this._listFiles())
      .map((p) => p.fullpath())
      .filter(
        (fullPath) => !this._shouldPreserveFiles || _.toLower(path.basename(fullPath)).endsWith(TMP_EXT)
      );
    if (_.isEmpty(files)) {
      return;
    }

    await asyncmap(
      files,
      (fullPath) => fs.rimraf(fullPath),
      {concurrency: MAX_TASKS}
    );
  }

  cleanupSync(): void {
    this._log.debug(`Cleaning up the '${this._root}' server storage folder`);

    if (!this._shouldPreserveRoot && !this._shouldPreserveFiles) {
      fs.rimrafSync(this._root);
      return;
    }

    let itemNames: string[];
    try {
      itemNames = nativeFs.readdirSync(this._root)
        .filter((name) => !_.startsWith(name, '.'));
    } catch (e) {
      this._log.warn(
        `Cannot list the '${this._root}' server storage folder. Original error: ${e.message}. ` +
        `Skipping the cleanup.`
      );
      return;
    }
    if (_.isEmpty(itemNames)) {
      if (!this._shouldPreserveRoot) {
        fs.rimrafSync(this._root);
      }
      return;
    }

    const matchedNames = itemNames.filter(
      (name) => !this._shouldPreserveFiles || _.toLower(name).endsWith(TMP_EXT)
    );
    for (const matchedName of matchedNames) {
      fs.rimrafSync(path.join(this._root, matchedName));
    }
    if (!this._shouldPreserveRoot && _.isEmpty(_.without(itemNames, ...matchedNames))) {
      fs.rimrafSync(this._root);
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
    const timer = new timing.Timer().start();
    const destination = fs.createWriteStream(fullPath);
    source.pipe(destination);
    try {
      await new Promise((resolve, reject) => {
        destination.once('finish', () => resolve(true));
        source.once('error', reject);
        destination.once('error', reject);
      });
      await this._finalizeItem(opts, timer, fullPath, await fs.hash(fullPath));
    } catch (e) {
      await fs.rimraf(fullPath);
      throw e;
    }
  }

  private async _addFromWebSocket(opts: ItemOptions, source: WebSocket): Promise<void> {
    const {name, sha1} = opts;
    const fullPath = path.join(this._root, toTempName(name));
    const timer = new timing.Timer().start();
    const destination = fs.createWriteStream(fullPath);
    const sha1sum = createHash('sha1');
    let didDigestMatch = false;
    let recentDigest: string | null = null;
    try {
      await new Promise((resolve, reject) => {
        source.on('message', (data: WebSocket.RawData) => {
          if (didDigestMatch) {
            // ignore further chunks if hashes have already matched
            return;
          }
          destination.write(data, (e) => {
            if (e) {
              source.close(WS_SERVER_ERROR);
              reject(e);
            }
          });
          sha1sum.update(data as any);
          recentDigest = sha1sum.copy().digest('hex');
          if (_.toLower(recentDigest) === _.toLower(sha1)) {
            didDigestMatch = true;
            destination.close(() => resolve(true));
          }
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
      await this._finalizeItem(opts, timer, fullPath, recentDigest ?? sha1sum.digest('hex'));
    } catch (e) {
      await fs.rimraf(fullPath);
      throw e;
    }
  }

  private async _finalizeItem(
    opts: ItemOptions,
    timer: timing.Timer,
    fullPath: string,
    actualHashDigest: string,
  ): Promise<void> {
    const {name, sha1} = opts;
    this._log.info(
      `'${name}' has been added to the server storage within ` +
      `${timer.getDuration().asMilliSeconds}ms. Verifying hashes.`
    );
    if (_.toLower(actualHashDigest) !== _.toLower(sha1)) {
      throw new StorageArgumentError(
        `The actual SHA1 hash value '${actualHashDigest}' must be equal ` +
        `to the expected hash value of '${sha1}' for '${name}'`
      );
    }
    await fs.mv(fullPath, path.join(this._root, name));
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
  if (!_.isString(opts.sha1) || opts.sha1.length !== SHA1_HASH_LEN) {
    throw new StorageArgumentError(
      `The provided hash value '${opts.sha1}' must be a valid SHA1 string, for ` +
      `example 'ccc963411b2621335657963322890305ebe96186'`
    );
  }
  return opts;
}

export class StorageArgumentError extends Error {}
