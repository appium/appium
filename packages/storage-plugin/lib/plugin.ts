import { BasePlugin } from 'appium/plugin';
import { errors } from 'appium/driver';
import { BIDI_COMMANDS_MAP } from './bidi-commands-map';
import { Storage, StorageArgumentError } from './storage';
import _ from 'lodash';
import { tempDir, fs } from '@appium/support';
import { StorageItem } from './types';

let SHARED_STORAGE: Storage | null = null;

export class StoragePlugin extends BasePlugin {
  static newBidiCommands = BIDI_COMMANDS_MAP;

  async uploadStorageItem(
    name: string, hash: string, size: number, chunk: string, position: number
  ): Promise<void> {
    await this._excuteStorageMethod(
      async (storage: Storage) => await storage.addChunk({
        name,
        hash,
        size,
        chunk,
        position,
      })
    );
  }

  async listStorageItems(): Promise<StorageItem[]> {
    return await this._excuteStorageMethod(
      async (storage: Storage) => await storage.list()
    );
  }

  async deleteStorageItem(name: string): Promise<boolean> {
    return await this._excuteStorageMethod(
      async (storage: Storage) => await storage.delete(name)
    );
  }

  async resetStorage(): Promise<void> {
    await this._excuteStorageMethod(
      async (storage: Storage) => await storage.reset()
    );
  }

  private _getStorageSingleton = _.memoize(async () => {
    let storageRoot: string;
    let shouldPreserveRoot: boolean;
    if (process.env.APPIUM_STORAGE_ROOT) {
      storageRoot = process.env.APPIUM_STORAGE_ROOT;
      shouldPreserveRoot = await fs.exists(storageRoot);
      this.log.info(`Set '${storageRoot}' as the server storage root folder`);
    } else {
      storageRoot = await tempDir.openDir();
      shouldPreserveRoot = false;
      this.log.info(`Created '${storageRoot}' as the temporary server storage root folder`);
    }
    SHARED_STORAGE = new Storage(storageRoot, shouldPreserveRoot, this.log);
    await SHARED_STORAGE.reset();
    return SHARED_STORAGE;
  });

  private async _excuteStorageMethod<T>(method: (storage: Storage) => Promise<T>): Promise<T> {
    const storage = await this._getStorageSingleton();
    try {
      return await method(storage);
    } catch (e) {
      if (e instanceof StorageArgumentError) {
        throw new errors.InvalidArgumentError(e.message);
      }
      throw e;
    }
  }
}

process.once('exit', () => {
  SHARED_STORAGE?.cleanupSync();
});

export default StoragePlugin;
