import {EventEmitter} from 'node:events';
import type {Socket} from 'node:net';

import {util} from '@appium/support';
import type {NextFunction, Request, Response} from 'express';
import {LRUCache} from 'lru-cache';

import {log} from './logger';

interface CachedResponse {
  method: string;
  path: string;
  response: Buffer | null;
  responseStateListener: EventEmitter | null;
}

const IDEMPOTENT_RESPONSES = new LRUCache<string, CachedResponse>({
  max: 64,
  ttl: 30 * 60 * 1000,
  updateAgeOnGet: true,
  dispose: ({responseStateListener}) => responseStateListener?.removeAllListeners(),
});
const MONITORED_METHODS = ['POST', 'PATCH'];
const IDEMPOTENCY_KEY_HEADER = 'x-idempotency-key';
const MAX_CACHED_PAYLOAD_SIZE_BYTES = 1 * 1024 * 1024; // 1 MiB
const PENDING_RESPONSES = new WeakMap<Response, Promise<void>>();

/** Keep retries pending until the route has finished work that outlives its HTTP connection. */
export function deferIdempotentResponse(res: Response): () => void {
  let complete!: () => void;
  PENDING_RESPONSES.set(
    res,
    new Promise<void>((resolve) => {
      complete = resolve;
    }),
  );
  return () => {
    PENDING_RESPONSES.delete(res);
    complete();
  };
}

/**
 * Middleware that caches and replays responses for idempotent requests using the
 * `x-idempotency-key` header. Only POST and PATCH are cached.
 */
export async function handleIdempotency(req: Request, res: Response, next: NextFunction): Promise<void> {
  const keyOrArr = req.headers[IDEMPOTENCY_KEY_HEADER];
  if (util.isEmpty(keyOrArr) || !keyOrArr) {
    return next();
  }

  const key = Array.isArray(keyOrArr) ? keyOrArr[0] : keyOrArr;

  log.updateAsyncContext({idempotencyKey: key});

  if (!MONITORED_METHODS.includes(req.method)) {
    return next();
  }

  log.debug(`Request idempotency key: ${key}`);
  const cached = IDEMPOTENT_RESPONSES.get(key);
  if (!cached) {
    cacheResponse(key, req, res);
    return next();
  }
  const {method, path, response, responseStateListener} = cached;
  if (req.method !== method || req.path !== path) {
    log.warn(`Got two different requests with the same idempotency key '${key}'`);
    log.warn('Is the client generating idempotency keys properly?');
    return next();
  }

  if (response) {
    log.info(`The same request with the idempotency key '${key}' has been already processed`);
    log.info(`Rerouting its response to the current request`);
    if (!res.socket?.writable) {
      return next();
    }
    res.socket.write(response);
  } else {
    log.info(`The same request with the idempotency key '${key}' is being processed`);
    log.info(`Waiting for the response to be rerouted to the current request`);
    if (!responseStateListener) {
      return next();
    }
    const onClose = () => responseStateListener.removeListener('ready', onReady);
    const onReady = (cachedResponse: Buffer | null) => {
      res.removeListener('close', onClose);
      if (res.destroyed) {
        return;
      }
      if (!cachedResponse) {
        void handleIdempotency(req, res, next);
        return;
      }
      res.socket?.write(cachedResponse);
    };
    responseStateListener.once('ready', onReady);
    res.once('close', onClose);
  }
}

function cacheResponse(key: string, req: Request, res: Response): void {
  if (!res.socket) {
    return;
  }

  const responseStateListener = new EventEmitter();
  const cached: CachedResponse = {
    method: req.method,
    path: req.path,
    response: null,
    responseStateListener,
  };
  IDEMPOTENT_RESPONSES.set(key, cached);
  const stopCapture = captureResponse(res.socket);
  let completed = false;
  const completeResponse = async (error?: string) => {
    if (completed) {
      return;
    }
    completed = true;
    const captured = stopCapture();
    await PENDING_RESPONSES.get(res);
    const errorMessage = error ?? captured.error;

    // Keep waiters alive until they are notified, even when deleting the cache entry.
    cached.responseStateListener = null;
    if (IDEMPOTENT_RESPONSES.get(key) !== cached) {
      log.info(`Could not cache the response identified by '${key}'. ` + `Cache consistency has been damaged`);
    } else if (errorMessage) {
      log.info(`Could not cache the response identified by '${key}': ${errorMessage}`);
      IDEMPOTENT_RESPONSES.delete(key);
    } else {
      cached.response = captured.response;
    }
    responseStateListener.emit('ready', cached.response);
  };
  res.once('error', (e: Error) => void completeResponse(e.message));
  res.once('finish', () => void completeResponse());
  res.once('close', () => {
    if (!res.writableFinished) {
      void completeResponse('Client disconnected before the response was sent');
    }
  });
}

function captureResponse(socket: Socket) {
  const originalSocketWriter = socket.write.bind(socket);
  let responseChunks: Buffer[] = [];
  let responseSize = 0;
  let errorMessage: string | null = null;
  const patchedWriter = (
    chunk: string | Uint8Array,
    encoding?: BufferEncoding | ((err?: Error | null) => void),
    next?: (err?: Error | null) => void,
  ): boolean => {
    if (typeof encoding === 'function') {
      next = encoding;
      encoding = undefined;
    }
    if (!errorMessage) {
      const buf = typeof chunk === 'string' ? Buffer.from(chunk, encoding) : Buffer.from(chunk);
      responseSize += buf.length;
      if (responseSize > MAX_CACHED_PAYLOAD_SIZE_BYTES) {
        errorMessage = `The actual response size exceeds the maximum allowed limit of ${MAX_CACHED_PAYLOAD_SIZE_BYTES} bytes`;
        responseChunks = [];
      } else {
        responseChunks.push(buf);
      }
    }
    return originalSocketWriter(chunk, encoding, next);
  };
  socket.write = patchedWriter;
  return () => {
    if (socket.write === patchedWriter) {
      socket.write = originalSocketWriter;
    }
    const response = errorMessage ? null : Buffer.concat(responseChunks);
    responseChunks = [];
    return {response, error: errorMessage};
  };
}
