import { BasePlugin } from 'appium/plugin';
import { requireValidItemOptions, Storage, StorageArgumentError } from './storage';
import _ from 'lodash';
import { tempDir, fs, logger } from '@appium/support';
import type {AddRequestResult, ItemOptions, StorageItem} from './types';
import type {Express, Request, Response} from 'express';
import type {AppiumServer} from '@appium/types';
import { LRUCache } from 'lru-cache';
import WebSocket from 'ws';
import { EventEmitter } from 'node:stream';
import { getResponseForW3CError } from 'appium/driver';

const log = logger.getLogger('StoragePlugin');

let SHARED_STORAGE: Storage | null = null;
const STORAGE_PREFIX = '/storage';
const WS_TTL_MS = 5 * 60 * 1000;
const STORAGE_HANDLERS: Record<string, (req: Request, httpServer?: AppiumServer) => Promise<any>> = {};
const STORAGE_ADDITIONS_CACHE: LRUCache<string, () => any> = new LRUCache({
  max: 20,
  ttl: WS_TTL_MS,
  dispose: (f: () => any) => f(),
});

export class StoragePlugin extends BasePlugin {

  static async updateServer(expressApp: Express, httpServer: AppiumServer): Promise<void> {
    const buildHandler = (methodName: string) => async (req: Request, res: Response) => {
      let status = 200;
      let body: any;
      try {
        const value = await STORAGE_HANDLERS[methodName](req, httpServer);
        body = {value: value ?? null};
      } catch (e) {
        [status, body] = getResponseForW3CError(e);
      }
      log.debug(
        `Responding to ${methodName} with ${_.truncate(JSON.stringify(body.value), {length: 200})}`
      );
      res.set('content-type', 'application/json; charset=utf-8');
      res.status(status).send(body);
    };

    expressApp.post(`${STORAGE_PREFIX}/add`, buildHandler(STORAGE_HANDLERS.addStorageItem.name));
    expressApp.get(`${STORAGE_PREFIX}/list`, buildHandler(STORAGE_HANDLERS.listStorageItems.name));
    expressApp.post(`${STORAGE_PREFIX}/reset`, buildHandler(STORAGE_HANDLERS.resetStorage.name));
    expressApp.post(`${STORAGE_PREFIX}/delete`, buildHandler(STORAGE_HANDLERS.deleteStorageItem.name));
  }
}

STORAGE_HANDLERS.addStorageItem = async function addStorageItem(
  req: Request, httpServer: AppiumServer
): Promise<AddRequestResult> {
  const itemOptions = requireValidItemOptions(
    parseRequestArgs(req, ['name', 'sha1']) as ItemOptions
  );
  const [stream, events] = prepareWebSockets(httpServer, itemOptions);
  return {
    ws: {
      stream,
      events,
    },
    ttlMs: WS_TTL_MS,
  };
};

STORAGE_HANDLERS.listStorageItems = async function listStorageItems(): Promise<StorageItem[]> {
  return await executeStorageMethod(
    async (storage: Storage) => await storage.list()
  );
};

STORAGE_HANDLERS.deleteStorageItem = async function deleteStorageItem(req: Request): Promise<boolean> {
  return await executeStorageMethod(
    async (storage: Storage) => await storage.delete(parseRequestArgs(req, ['name']).name)
  );
};

STORAGE_HANDLERS.resetStorage = async function resetStorage(): Promise<void> {
  await executeStorageMethod(
    async (storage: Storage) => await storage.reset()
  );
};

async function executeStorageMethod<T>(method: (storage: Storage) => Promise<T>): Promise<T> {
  const storage = await getStorageSingleton();
  return await method(storage);
}

function parseRequestArgs(req: Request, requiredKeys: string[]): Record<string, any> {
  if (!_.isPlainObject(req.body)) {
    throw new StorageArgumentError(`The request body must be a valid JSON object`);
  }
  for (const key of requiredKeys) {
    if (!_.keys(req.body).includes(key)) {
      throw new StorageArgumentError(
        `The required argument '${key}' is missing (expected ${JSON.stringify(requiredKeys)})`
      );
    }
  }
  return req.body;
}

function prepareWebSockets(httpServer: AppiumServer, itemOptions: ItemOptions): [string, string] {
  const commonPathname = `${STORAGE_PREFIX}/add/${itemOptions.sha1}`;
  const streamPathname = `${commonPathname}/stream`;
  const eventsPathname = `${commonPathname}/events`;
  if (!_.isEmpty(httpServer.getWebSocketHandlers(streamPathname))) {
    return [streamPathname, eventsPathname];
  }

  const streamServer = new WebSocket.Server({
    noServer: true,
  });
  const eventsServer = new WebSocket.Server({
    noServer: true,
  });
  const signaler = new EventEmitter();
  const streamDoneCallback = () => {
    log.debug(`Unmounting stream and events web sockets at ${commonPathname}`);
    httpServer.removeWebSocketHandler(streamPathname);
    httpServer.removeWebSocketHandler(eventsPathname);
    setTimeout(() => {
      streamServer.close();
      eventsServer.close();
      signaler.removeAllListeners();
    }, 100);
  };
  STORAGE_ADDITIONS_CACHE.set(itemOptions.sha1, streamDoneCallback);
  eventsServer.on('connection', async (wsUpstream: WebSocket) => {
    signaler.on('status', (value) => wsUpstream.send(JSON.stringify(value)));
  });
  eventsServer.on('error', (e) => {
    log.info(`The ${eventsPathname} web socket server has notified about an error: ${e.message}`);
  });
  streamServer.on('connection', async (wsUpstream: WebSocket) => {
    log.info(`Starting a new server storage upload of '${itemOptions.name}' at ${streamPathname}`);
    const storage = await getStorageSingleton();
    try {
      await storage.add(itemOptions, wsUpstream);
      const successEvent = {
        value: {
          success: true,
          ...itemOptions,
        }
      };
      log.debug(`Notifying about the successful addition of '${itemOptions.name}' to the server storage`);
      signaler.emit('status', successEvent);
      STORAGE_ADDITIONS_CACHE.delete(itemOptions.sha1);
    } catch (e) {
      log.debug(`Notifying about a failure while adding '${itemOptions.name}' to the server storage`);
      // in case of a failure we do not want to close the server yet
      // in anticipation of a retry
      log.error(e);
      const [, errorBody] = getResponseForW3CError(e);
      signaler.emit('status', errorBody);
    }
  });
  streamServer.on('error', (e) => {
    log.info(`The ${streamPathname} web socket server has notified about an error: ${e.message}`);
  });
  httpServer.addWebSocketHandler(streamPathname, streamServer);
  httpServer.addWebSocketHandler(eventsPathname, eventsServer);

  return [streamPathname, eventsPathname];
}

const getStorageSingleton = _.memoize(async () => {
  let storageRoot: string;
  let shouldPreserveRoot = false;
  let shouldPreserveFiles = false;
  if (process.env.APPIUM_STORAGE_ROOT) {
    storageRoot = process.env.APPIUM_STORAGE_ROOT;
    shouldPreserveRoot = shouldPreserveFiles = await fs.exists(storageRoot);
    log.info(`Set '${storageRoot}' as the server storage root folder`);
  } else {
    storageRoot = await tempDir.openDir();
    log.info(`Created '${storageRoot}' as the temporary server storage root folder`);
  }
  if (process.env.APPIUM_STORAGE_KEEP_ALL) {
    shouldPreserveFiles = ['true', '1', 'yes'].includes(_.toLower(process.env.APPIUM_STORAGE_KEEP_ALL));
  }
  if (shouldPreserveFiles) {
    log.info(`All server storage items will be always preserved unless deleted explicitly`);
  } else {
    log.info(
      `All server storage items will be cleaned up automatically from '${storageRoot}' after ` +
      `Appium server termination`
    );
  }
  SHARED_STORAGE = new Storage(
    storageRoot,
    shouldPreserveRoot,
    shouldPreserveFiles,
    log,
  );
  await SHARED_STORAGE.reset();
  return SHARED_STORAGE;
});

process.once('exit', () => {
  SHARED_STORAGE?.cleanupSync();
});

export default StoragePlugin;
