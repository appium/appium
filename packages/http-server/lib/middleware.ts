import type {IncomingMessage} from 'node:http';
import type {Duplex} from 'node:stream';

import {
  calcSignature,
  errors,
  getResponseForW3CError,
  invalidJsonParseError,
  rememberJsonParseError,
} from '@appium/base-driver';
import {util} from '@appium/support';
import type {StringRecord, WSServer} from '@appium/types';
import bodyParser from 'body-parser';
import type {Express, NextFunction, Request, RequestHandler, Response, Router} from 'express';
import {match} from 'path-to-regexp';

import {log} from './logger.js';

export {handleIdempotency} from '@appium/base-driver';

const SESSION_ID_PATTERN = /\/session\/([^/]+)/;

/**
 * Basic CORS middleware.
 * Sets permissive CORS headers and responds immediately to `OPTIONS` requests with 200.
 */
export function allowCrossDomain(req: Request, res: Response, next: NextFunction): void {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS, DELETE');
  res.header(
    'Access-Control-Allow-Headers',
    'Cache-Control, Pragma, Origin, X-Requested-With, Content-Type, Accept, User-Agent',
  );

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Rejects state-changing requests that carry an `Origin` header (sent by browsers cross-origin),
 * including CORS "simple" form posts that skip preflight. Only used when CORS is not allowed.
 */
export function rejectBrowserOrigin(req: Request, res: Response, next: NextFunction): void {
  if (!SAFE_METHODS.has(req.method) && fetchHeaderValue(req, 'origin') !== undefined) {
    log.warn(`Rejecting ${req.method} ${req.path} from the browser origin '${req.headers.origin}'`);
    // W3C defines no 403 error code, so only the body shape is W3C-compliant
    const [, body] = getResponseForW3CError(new errors.UnknownError('Browser-origin requests are not allowed'));
    res.status(403).json(body);
    return;
  }
  next();
}

/**
 * Populates the logger's async context with request and session metadata.
 * Derives `requestId`, optional session id/signature, and `isSensitive` flag from headers/URL.
 */
export function handleLogContext(req: Request, _res: Response, next: NextFunction): void {
  const requestId = fetchHeaderValue(req, 'x-request-id') || util.uuidV4();

  const sessionId = SESSION_ID_PATTERN.exec(req.path)?.[1];
  const sessionInfo = sessionId ? {sessionId, sessionSignature: calcSignature(sessionId)} : {};
  const isSensitiveHeaderValue = fetchHeaderValue(req, 'x-appium-is-sensitive');

  log.updateAsyncContext(
    {
      requestId,
      ...sessionInfo,
      isSensitive: ['true', '1', 'yes'].includes(String(isSensitiveHeaderValue ?? '').toLowerCase()),
    },
    true,
  );

  next();
}

/**
 * Ensures requests default to JSON content-type when none is provided.
 */
export function defaultToJSONContentType(req: Request, _res: Response, next: NextFunction): void {
  if (!req.headers['content-type']) {
    req.headers['content-type'] = 'application/json; charset=utf-8';
  }
  next();
}

/** Options for {@linkcode tryHandleWebSocketUpgrade} */
export interface WebSocketUpgradeOpts {
  /** Incoming HTTP request */
  req: IncomingMessage;
  /** Network socket */
  socket: Duplex;
  /** First packet of the upgraded stream */
  head: Buffer;
  /** Path-to-WebSocket-server mapping */
  webSocketsMapping: StringRecord<WSServer>;
  /** Whether upgrades carrying an `Origin` header are accepted */
  allowCors?: boolean;
}

/**
 * Attempts to handle a WebSocket upgrade by matching the request path against registered handlers.
 *
 * @param opts - Upgrade options
 * @returns `true` if the upgrade was handled; `false` otherwise
 */
export function tryHandleWebSocketUpgrade({
  req,
  socket,
  head,
  webSocketsMapping,
  allowCors = false,
}: WebSocketUpgradeOpts): boolean {
  if (String(req.headers?.upgrade ?? '').toLowerCase() !== 'websocket') {
    return false;
  }

  // WebSocket handshakes are not subject to the Same-Origin Policy; browsers always send Origin
  if (!allowCors && req.headers.origin !== undefined) {
    log.warn(`Rejecting the WebSocket upgrade from the browser origin '${req.headers.origin}'`);
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
    return true;
  }

  let currentPathname: string;
  try {
    currentPathname = new URL(req.url ?? '', 'http://localhost').pathname;
  } catch {
    currentPathname = req.url ?? '';
  }
  try {
    for (const [pathname, wsServer] of Object.entries(webSocketsMapping)) {
      // We only need a match, not decoded parameters. Malformed percent escapes must
      // not throw from the HTTP server's native upgrade event listener.
      if (match(pathname, {decode: false})(currentPathname)) {
        wsServer.handleUpgrade(req, socket, head, (ws) => {
          wsServer.emit('connection', ws, req);
        });
        return true;
      }
    }
  } catch (err) {
    log.warn(`Could not upgrade WebSocket connection: ${err instanceof Error ? err.message : String(err)}`);
    socket.destroy();
    // The failed connection is consumed, including when called as Express middleware.
    return true;
  }
  log.info(`Did not match the websocket upgrade request at ${currentPathname} to any known route`);
  return false;
}

/**
 * Express middleware wrapper around {@link tryHandleWebSocketUpgrade}.
 * Delegates WebSocket upgrades to the mapping and falls through to `next()` otherwise.
 *
 * @param webSocketsMapping - Path-to-WebSocket-server mapping
 * @param allowCors - Whether upgrades carrying an `Origin` header are accepted
 * @returns Express request handler
 */
export function handleUpgrade(webSocketsMapping: StringRecord<WSServer>, allowCors = false): RequestHandler {
  function handleUpgradeMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (tryHandleWebSocketUpgrade({req, socket: req.socket, head: Buffer.from(''), webSocketsMapping, allowCors})) {
      return;
    }
    next();
  }

  return handleUpgradeMiddleware;
}

/**
 * Final error-handling middleware.
 * Logs uncaught errors and returns a W3C-formatted error response unless headers were already sent.
 */
export function catchAllHandler(err: Error, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  log.error(`Uncaught error: ${err.message}`);
  const [status, body] = getResponseForW3CError(
    isBodyParseError(err) ? new errors.InvalidArgumentError(err.message) : err,
  );
  res.status(status).json(body);
}

/**
 * Detects the error body-parser raises for a request body that is not valid JSON.
 */
function isBodyParseError(err: unknown): err is Error {
  return (err as {type?: string} | null)?.type === 'entity.parse.failed';
}

// make sure appium never fails because of a file size upload limit
const jsonBodyParser = bodyParser.json({limit: '1gb'});

/**
 * Parses a JSON body. A parse failure is remembered and the request continues, so an unknown
 * route or a missing session can be reported before `invalid argument`.
 */
export function parseJsonBody(req: Request, res: Response, next: NextFunction): void {
  jsonBodyParser(req, res, (err?: unknown) => {
    if (isBodyParseError(err)) {
      rememberJsonParseError(req, err);
      next();
      return;
    }
    next(err as Error | undefined);
  });
}

// `use` stays out. It matches a prefix, so a bad body would be invalid argument for a URL the mounted router does not own.
const MATCHED_ROUTE_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'all'] as const;

function sendJsonParseError(req: Request, res: Response, next: NextFunction): void {
  const jsonParseError = invalidJsonParseError(req);
  if (!jsonParseError) {
    next();
    return;
  }
  const [status, body] = getResponseForW3CError(jsonParseError);
  res.status(status).json(body);
}

/**
 * Extension routes are registered after the protocol routes.
 * A remembered JSON parse failure is `invalid argument` when one of those routes matches.
 * Call the returned function before the 404 handler: that handler matches every leftover URL.
 */
export function guardExtensionRoutes(router: Router | Express): () => void {
  const restore: (() => void)[] = [];
  for (const method of MATCHED_ROUTE_METHODS) {
    const original = (router[method] as (...args: any[]) => any).bind(router);
    restore.push(() => {
      (router as any)[method] = original;
    });
    (router as any)[method] = (...args: any[]) => {
      const pathAt = args.findIndex((arg) => typeof arg !== 'function');
      if (pathAt === -1) {
        return original(...args);
      }
      const guarded = args.slice();
      guarded.splice(pathAt + 1, 0, sendJsonParseError);
      return original(...guarded);
    };
  }
  return () => {
    for (const undo of restore) {
      undo();
    }
  };
}

/**
 * 404 handler for unmatched routes.
 * Logs a debug message and responds with `UnknownCommandError` in W3C format.
 */
export function catch404Handler(req: Request, res: Response): void {
  log.debug(`No route found for ${req.url}`);
  const [status, body] = getResponseForW3CError(new errors.UnknownCommandError());
  res.status(status).json(body);
}

function fetchHeaderValue(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : (value as string | undefined);
}
