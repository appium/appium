import log from './logger';
import LRU from 'lru-cache';
import _ from 'lodash';
import {EventEmitter} from 'events';

const IDEMPOTENT_RESPONSES = new LRU({
  max: 64,
  ttl: 30 * 60 * 1000,
  updateAgeOnGet: true,
  updateAgeOnHas: true,
  dispose: (key, {responseStateListener}) => {
    responseStateListener.removeAllListeners();
  }
});
const MONITORED_METHODS = ['POST', 'PATCH'];
const IDEMPOTENCY_KEY_HEADER = 'x-idempotency-key';

/**
 *
 * @param {string} key
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
function cacheResponse(key, req, res) {
  if (!res.socket) {
    return;
  }

  const responseStateListener = new EventEmitter();
  IDEMPOTENT_RESPONSES.set(key, {
    method: req.method,
    path: req.path,
    /** @type {Buffer?} */response: null,
    responseStateListener,
  });
  const originalSocketWriter = res.socket.write.bind(res.socket);
  let response = null;
  const patchedWriter = (
    /**@type {Uint8Array | string}*/chunk,
    /**@type {BufferEncoding | null}*/encoding,
    next
  ) => {
    const buf = chunk instanceof Uint8Array
      ? Buffer.from(chunk.buffer)
      : Buffer.from(chunk, _.isString(encoding) ? encoding : undefined);
    response = response ? Buffer.concat([response, buf]) : buf;
    return originalSocketWriter(chunk, encoding, next);
  };
  // @ts-ignore This should be fine
  res.socket.write = patchedWriter;
  let httpErrorMessage = null;
  let isResponseFullySent = false;
  res.once('error', (e) => { httpErrorMessage = e.message; });
  req.once('error', (e) => { httpErrorMessage = e.message; });
  res.once('finish', () => { isResponseFullySent = true; });
  res.once('close', () => {
    if (res.socket?.write === patchedWriter) {
      res.socket.write = originalSocketWriter;
    }

    if (!IDEMPOTENT_RESPONSES.has(key)) {
      log.info(
        `Could not cache the response identified by '${key}'. ` +
        `Cache consistency has been damaged`
      );
    } else if (httpErrorMessage) {
      log.info(`Could not cache the response identified by '${key}': ${httpErrorMessage}`);
      IDEMPOTENT_RESPONSES.delete(key);
    } else if (!isResponseFullySent) {
      log.info(
        `Could not cache the response identified by '${key}', ` +
        `because it has not been completed`
      );
      log.info('Does the client terminate connections too early?');
      IDEMPOTENT_RESPONSES.delete(key);
    }

    const value = IDEMPOTENT_RESPONSES.get(key);
    if (value) {
      value.response = response;
      responseStateListener.emit('ready', response);
    } else {
      responseStateListener.emit('ready', null);
    }
  });
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function handleIdempotency(req, res, next) {
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
    cacheResponse(_.isArray(key) ? key[0] : key, req, res);
    return next();
  }

  const {
    method,
    path,
    response,
    responseStateListener,
  } = IDEMPOTENT_RESPONSES.get(key);
  if (req.method !== method || req.path !== path) {
    log.warn(`Got two different requests with the same idempotency key '${key}'`);
    log.warn('Is the client generating idempotency keys properly?');
    return next();
  }

  if (response) {
    log.info(`The same request with the idempotency key '${key}' has been already processed`);
    log.info(`Rerouting its response to the current request`);
    res.end(response);
  } else {
    log.info(`The same request with the idempotency key '${key}' is being processed`);
    log.info(`Waiting for the response to be rerouted to the current request`);
    responseStateListener.once('ready', async (/** @type {Buffer?} */ cachedResponseBuf) => {
      if (!cachedResponseBuf) {
        return next();
      }
      res.end(cachedResponseBuf);
    });
  }
}

export {handleIdempotency};
