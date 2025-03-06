import { BasePlugin } from 'appium/plugin';
import { BIDI_COMMANDS_MAP } from './bidi-commands-map';
import { Storage } from './storage';
import _ from 'lodash';
import { tempDir, fs } from '@appium/support';
import { StorageItem } from './types';

let SHARED_STORAGE: Storage | null = null;

export class StoragePlugin extends BasePlugin {
  constructor(name: string, cliArgs: Record<string, unknown>) {
    super(name, cliArgs);
  }

  static newBidiCommands = BIDI_COMMANDS_MAP;

  async uploadStorageItem(
    name: string, hash: string, size: number, chunk: string, position: number
  ): Promise<void> {
    const storage = await this._getStorageSingleton();
    await storage.addChunk({
      name,
      hash,
      size,
      chunk,
      position,
    });
  }

  async listStorageItems(): Promise<StorageItem[]> {
    const storage = await this._getStorageSingleton();
    return await storage.list();
  }

  async deleteStorageItem(name: string): Promise<boolean> {
    const storage = await this._getStorageSingleton();
    return await storage.delete(name);
  }

  async resetStorage(): Promise<void> {
    const storage = await this._getStorageSingleton();
    await storage.reset();
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
}

process.once('exit', () => {
  SHARED_STORAGE?.cleanupSync();
});

export default StoragePlugin;
