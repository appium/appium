import {log} from './logger';
import {LRUCache} from 'lru-cache';
import _ from 'lodash';
import {EventEmitter} from 'node:events';
import type {Request, Response, NextFunction} from 'express';

interface CachedResponse {
  method: string;
  path: string;
  response: Buffer | null;
  responseStateListener: EventEmitter | null | undefined;
}

const IDEMPOTENT_RESPONSES = new LRUCache<string, CachedResponse>({
  max: 64,
  ttl: 30 * 60 * 1000,
  updateAgeOnGet: true,
  updateAgeOnHas: true,
  dispose: ({responseStateListener}) => {
    responseStateListener?.removeAllListeners();
  },
});
const MONITORED_METHODS = ['POST', 'PATCH'];
const IDEMPOTENCY_KEY_HEADER = 'x-idempotency-key';
const MAX_CACHED_PAYLOAD_SIZE_BYTES = 1 * 1024 * 1024; // 1 MiB

/**
 * Middleware that caches and replays responses for idempotent requests using the
 * `x-idempotency-key` header. Only POST and PATCH are cached.
 */
export async function handleIdempotency(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const keyOrArr = req.headers[IDEMPOTENCY_KEY_HEADER];
  if (_.isEmpty(keyOrArr) || !keyOrArr) {
    next();
    return;
  }

  const key = _.isArray(keyOrArr) ? keyOrArr[0] : keyOrArr;

  log.updateAsyncContext({idempotencyKey: key});

  if (!MONITORED_METHODS.includes(req.method)) {
    next();
    return;
  }

  log.debug(`Request idempotency key: ${key}`);
  if (!IDEMPOTENT_RESPONSES.has(key)) {
    cacheResponse(key, req, res);
    next();
    return;
  }

  const cached = IDEMPOTENT_RESPONSES.get(key);
  if (!cached) {
    next();
    return;
  }
  const {method, path, response, responseStateListener} = cached;
  if (req.method !== method || req.path !== path) {
    log.warn(`Got two different requests with the same idempotency key '${key}'`);
    log.warn('Is the client generating idempotency keys properly?');
    next();
    return;
  }

  if (response) {
    log.info(`The same request with the idempotency key '${key}' has been already processed`);
    log.info(`Rerouting its response to the current request`);
    if (!res.socket?.writable) {
      next();
      return;
    }
    res.socket.write(response.toString('utf8'));
  } else {
    log.info(`The same request with the idempotency key '${key}' is being processed`);
    log.info(`Waiting for the response to be rerouted to the current request`);
    if (!responseStateListener) {
      next();
      return;
    }
    responseStateListener.once('ready', (cachedResponse: Buffer | null) => {
      if (!cachedResponse || !res.socket?.writable) {
        next();
        return;
      }
      res.socket.write(cachedResponse.toString('utf8'));
    });
  }
}

function cacheResponse(key: string, req: Request, res: Response): void {
  if (!res.socket) {
    return;
  }

  const responseStateListener = new EventEmitter();
  IDEMPOTENT_RESPONSES.set(key, {
    method: req.method,
    path: req.path,
    response: null,
    responseStateListener,
  });
  const socket = res.socket;
  const originalSocketWriter = socket.write.bind(socket);
  const responseRef = new WeakRef(res);
  let responseChunks: Buffer[] = [];
  let responseSize = 0;
  let errorMessage: string | null = null;
  const patchedWriter = (
    chunk: unknown,
    encoding: BufferEncoding | (() => void),
    next?: (() => void) | ((err?: Error) => void)
  ): boolean => {
    if (errorMessage || !responseRef.deref()) {
      responseChunks = [];
      responseSize = 0;
      return originalSocketWriter(
        chunk as string | Buffer | Uint8Array,
        encoding as BufferEncoding,
        next as (err?: Error) => void
      );
    }

    const buf = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk as string, typeof encoding === 'string' ? encoding : undefined);
    responseChunks.push(buf);
    responseSize += buf.length;
    if (responseSize > MAX_CACHED_PAYLOAD_SIZE_BYTES) {
      errorMessage =
        `The actual response size exceeds ` +
        `the maximum allowed limit of ${MAX_CACHED_PAYLOAD_SIZE_BYTES} bytes`;
    }
    return originalSocketWriter(
      chunk as string | Buffer | Uint8Array,
      encoding as BufferEncoding,
      next as (err?: Error) => void
    );
  };
  socket.write = patchedWriter as typeof socket.write;
  let didEmitReady = false;
  res.once('error', (e: Error) => {
    errorMessage = e.message;
    if (socket.write === patchedWriter) {
      socket.write = originalSocketWriter;
    }

    if (!IDEMPOTENT_RESPONSES.has(key)) {
      log.info(
        `Could not cache the response identified by '${key}'. ` +
          `Cache consistency has been damaged`
      );
    } else {
      log.info(`Could not cache the response identified by '${key}': ${errorMessage}`);
      IDEMPOTENT_RESPONSES.delete(key);
    }

    responseChunks = [];
    responseSize = 0;
    if (!didEmitReady) {
      responseStateListener.emit('ready', null);
      didEmitReady = true;
    }
  });
  res.once('finish', () => {
    if (socket.write === patchedWriter) {
      socket.write = originalSocketWriter;
    }

    if (!IDEMPOTENT_RESPONSES.has(key)) {
      log.info(
        `Could not cache the response identified by '${key}'. ` +
          `Cache consistency has been damaged`
      );
    } else if (errorMessage) {
      log.info(`Could not cache the response identified by '${key}': ${errorMessage}`);
      IDEMPOTENT_RESPONSES.delete(key);
    }

    const value = IDEMPOTENT_RESPONSES.get(key);
    if (value) {
      value.response = Buffer.concat(responseChunks);
    }
    responseChunks = [];
    responseSize = 0;
    if (!didEmitReady) {
      responseStateListener.emit('ready', value?.response ?? null);
      didEmitReady = true;
    }
  });
  res.once('close', () => {
    if (socket.write === patchedWriter) {
      socket.write = originalSocketWriter;
    }

    if (!didEmitReady) {
      const value = IDEMPOTENT_RESPONSES.get(key);
      responseStateListener.emit('ready', value?.response ?? null);
      didEmitReady = true;
    }
  });
}
