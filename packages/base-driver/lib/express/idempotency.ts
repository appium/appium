import {EventEmitter} from 'node:events';
import type {OutgoingHttpHeaders} from 'node:http';
import type {Socket} from 'node:net';

import {util} from '@appium/support';
import type {NextFunction, Request, Response} from 'express';
import {LRUCache} from 'lru-cache';

import {log} from './logger';

interface SessionResponse {
  statusCode: number;
  headers: OutgoingHttpHeaders;
  body: string;
}

type ReplayResponse = Buffer | SessionResponse;

interface CachedResponse {
  method: string;
  path: string;
  response: ReplayResponse | null;
  responseStateListener: EventEmitter | null;
}

const IDEMPOTENT_RESPONSES = new LRUCache<string, CachedResponse>({
  max: 64,
  ttl: 30 * 60 * 1000,
  updateAgeOnGet: true,
});
const MONITORED_METHODS = ['POST', 'PATCH'];
const IDEMPOTENCY_KEY_HEADER = 'x-idempotency-key';
const MAX_CACHED_PAYLOAD_SIZE_BYTES = 1 * 1024 * 1024; // 1 MiB
const RESPONSE_PRESERVERS = new WeakMap<Response, () => void>();

/** Preserve a keyed Create Session result independently of its original connection. */
export function preserveIdempotentSessionResponse(res: Response): boolean {
  const preserve = RESPONSE_PRESERVERS.get(res);
  RESPONSE_PRESERVERS.delete(res);
  preserve?.();
  return Boolean(preserve);
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
  if (res.destroyed || !res.socket?.writable) {
    return;
  }

  if (response) {
    log.info(`The same request with the idempotency key '${key}' has been already processed`);
    log.info(`Rerouting its response to the current request`);
    replayResponse(res, response);
  } else {
    log.info(`The same request with the idempotency key '${key}' is being processed`);
    log.info(`Waiting for the response to be rerouted to the current request`);
    if (!responseStateListener) {
      return next();
    }
    const onClose = () => responseStateListener.removeListener('ready', onReady);
    const onReady = async (cachedResponse: ReplayResponse | null) => {
      res.removeListener('close', onClose);
      if (res.destroyed || !res.socket?.writable) {
        return;
      }
      try {
        if (!cachedResponse) {
          await handleIdempotency(req, res, next);
        } else {
          replayResponse(res, cachedResponse);
        }
      } catch (err) {
        // EventEmitter does not handle rejected listeners; keep errors on this retry's Express chain.
        next(err);
      }
    };
    responseStateListener.once('ready', onReady);
    res.once('close', onClose);
  }
}

function replayResponse(res: Response, response: ReplayResponse): void {
  if (Buffer.isBuffer(response)) {
    res.socket?.write(response);
  } else {
    res.status(response.statusCode).set(response.headers).send(response.body);
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
  let preserved = false;
  const completeResponse = (response: ReplayResponse | null, error?: string | null) => {
    if (completed) {
      return;
    }
    completed = true;
    RESPONSE_PRESERVERS.delete(res);

    cached.responseStateListener = null;
    if (IDEMPOTENT_RESPONSES.get(key) !== cached) {
      log.info(`The response cache entry identified by '${key}' was evicted before completion`);
    } else if (error) {
      log.info(`Could not cache the response identified by '${key}': ${error}`);
      IDEMPOTENT_RESPONSES.delete(key);
    } else {
      cached.response = response;
    }
    // Existing waiters still need the result if the entry was evicted or is too large to retain.
    responseStateListener.emit('ready', response);
  };
  const completeSocketResponse = (error?: string) => {
    if (preserved || completed) {
      return;
    }
    const captured = stopCapture();
    completeResponse(error ? null : captured.response, error ?? captured.error);
  };
  RESPONSE_PRESERVERS.set(res, () => {
    preserved = true;
    stopCapture();
    const send = res.send.bind(res);
    // The protocol handler sends serialized JSON, even after the client has disconnected.
    res.send = (body: string) => {
      res.send = send;
      const result = send(body);
      completeResponse(
        {statusCode: res.statusCode, headers: res.getHeaders(), body},
        Buffer.byteLength(body) > MAX_CACHED_PAYLOAD_SIZE_BYTES
          ? 'Session response exceeds the cache size limit'
          : null,
      );
      return result;
    };
  });
  res.once('error', (e: Error) => completeSocketResponse(e.message));
  res.once('finish', () => completeSocketResponse());
  res.once('close', () => {
    if (!res.writableFinished) {
      completeSocketResponse('Client disconnected before the response was sent');
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
