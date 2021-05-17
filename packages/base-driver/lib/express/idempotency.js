import log from './logger';
import LRU from 'lru-cache';
import { fs, util } from 'appium-support';
import os from 'os';
import path from 'path';
import { EventEmitter } from 'events';


const CACHE_SIZE = 1024;
const IDEMPOTENT_RESPONSES = new LRU({
  max: CACHE_SIZE,
  updateAgeOnGet: true,
  dispose (key, {response}) {
    if (response) {
      fs.rimrafSync(response);
    }
  },
});
const MONITORED_METHODS = ['POST', 'PATCH'];
const IDEMPOTENCY_KEY_HEADER = 'x-idempotency-key';

process.on('exit', () => {
  const resPaths = IDEMPOTENT_RESPONSES.values()
    .map(({response}) => response)
    .filter(Boolean);
  for (const resPath of resPaths) {
    try {
      // Asynchronous calls are not supported in onExit handler
      fs.rimrafSync(resPath);
    } catch (ign) {}
  }
});


function cacheResponse (key, req, res) {
  const responseStateListener = new EventEmitter();
  IDEMPOTENT_RESPONSES.set(key, {
    method: req.method,
    path: req.path,
    response: null,
    responseStateListener,
  });
  const tmpFile = path.resolve(os.tmpdir(), `${util.uuidV4()}.response`);
  const responseListener = fs.createWriteStream(tmpFile, {
    emitClose: true,
  });
  const originalSocketWriter = res.socket.write.bind(res.socket);
  const patchedWriter = (chunk, encoding, next) => {
    if (responseListener.writable) {
      responseListener.write(chunk);
    }
    return originalSocketWriter(chunk, encoding, next);
  };
  res.socket.write = patchedWriter;
  let writeError = null;
  let isResponseFullySent = false;
  responseListener.once('error', (e) => {
    writeError = e;
  });
  res.once('finish', () => {
    isResponseFullySent = true;
    responseListener.end();
  });
  res.once('close', () => {
    if (!isResponseFullySent) {
      responseListener.end();
    }
  });
  responseListener.once('close', () => {
    if (res.socket?.write === patchedWriter) {
      res.socket.write = originalSocketWriter;
    }

    if (!IDEMPOTENT_RESPONSES.has(key)) {
      log.info(`Could not cache the response identified by '${key}'. ` +
        `Cache consistency has been damaged`);
      return responseStateListener.emit('ready', null);
    }
    if (writeError) {
      log.info(`Could not cache the response identified by '${key}': ${writeError.message}`);
      IDEMPOTENT_RESPONSES.del(key);
      return responseStateListener.emit('ready', null);
    }
    if (!isResponseFullySent) {
      log.info(`Could not cache the response identified by '${key}', ` +
        `because it has not been completed`);
      log.info('Does the client terminate connections too early?');
      IDEMPOTENT_RESPONSES.del(key);
      return responseStateListener.emit('ready', null);
    }

    IDEMPOTENT_RESPONSES.get(key).response = tmpFile;
    responseStateListener.emit('ready', tmpFile);
  });
}

async function handleIdempotency (req, res, next) {
  const key = req.headers[IDEMPOTENCY_KEY_HEADER];
  if (!key) {
    return next();
  }
  if (!MONITORED_METHODS.includes(req.method)) {
    // GET, DELETE, etc. requests are idempotent by default
    // there is no need to cache them
    return next();
  }

  log.debug(`Request idempotency key: ${key}`);
  if (!IDEMPOTENT_RESPONSES.has(key)) {
    cacheResponse(key, req, res);
    return next();
  }

  const {
    method: storedMethod,
    path: storedPath,
    response,
    responseStateListener,
  } = IDEMPOTENT_RESPONSES.get(key);
  if (req.method !== storedMethod || req.path !== storedPath) {
    log.warn(`Got two different requests with the same idempotency key '${key}'`);
    log.warn('Is the client generating idempotency keys properly?');
    return next();
  }

  const rerouteCachedResponse = async (cachedResPath) => {
    if (!await fs.exists(cachedResPath)) {
      IDEMPOTENT_RESPONSES.del(key);
      log.warn(`Could not read the cached response identified by key '${key}'`);
      log.warn('The temporary storage is not accessible anymore');
      return next();
    }
    fs.createReadStream(cachedResPath).pipe(res.socket);
  };

  if (response) {
    log.info(`The same request with the idempotency key '${key}' has been already processed`);
    log.info(`Rerouting its response to the current request`);
    await rerouteCachedResponse(response);
  } else {
    log.info(`The same request with the idempotency key '${key}' is being processed`);
    log.info(`Waiting for the response to be rerouted to the current request`);
    responseStateListener.once('ready', async (cachedResponsePath) => {
      if (!cachedResponsePath) {
        return next();
      }
      await rerouteCachedResponse(cachedResponsePath);
    });
  }
}

export { handleIdempotency };
