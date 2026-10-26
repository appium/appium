import type {IncomingMessage} from 'node:http';
import type {Duplex} from 'node:stream';

import {util} from '@appium/support';
import type {NextFunction, Request, RequestHandler, Response} from 'express';

import {errors} from '../protocol';
import {log} from './logger';
export {handleIdempotency} from './idempotency';
import type {StringRecord, WSServer} from '@appium/types';
import {match} from 'path-to-regexp';

import {calcSignature} from '../helpers/session';
import {getResponseForW3CError} from '../protocol/errors';

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

/**
 * CORS middleware for async execute response endpoints only.
 * Leaves other routes untouched but applies {@link allowCrossDomain} to async response URLs.
 *
 * @param basePath - Server base path (e.g. `/wd/hub` or `/`)
 * @returns Express request handler
 */
export function allowCrossDomainAsyncExecute(basePath: string): RequestHandler {
  function allowCrossDomainAsyncExecuteHandler(req: Request, res: Response, next: NextFunction): void {
    const receiveAsyncResponseRegExp = new RegExp(
      `^${util.escapeRegExp(basePath)}/session/[a-f0-9-]+/(appium/)?receive_async_response/?$`,
    );
    // Match against req.path (query-stripped) so query-string data cannot be used
    // to smuggle a match for an otherwise unrelated endpoint.
    if (!receiveAsyncResponseRegExp.test(req.path)) {
      next();
      return;
    }
    allowCrossDomain(req, res, next);
  }

  return allowCrossDomainAsyncExecuteHandler;
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
  for (const [pathname, wsServer] of Object.entries(webSocketsMapping)) {
    if (match(pathname)(currentPathname)) {
      wsServer.handleUpgrade(req, socket, head, (ws) => {
        wsServer.emit('connection', ws, req);
      });
      return true;
    }
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
 * The protocol expects such a request to be rejected as an invalid argument.
 */
function isBodyParseError(err: Error): boolean {
  return (err as Error & {type?: string})?.type === 'entity.parse.failed';
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
