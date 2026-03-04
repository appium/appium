import _ from 'lodash';
import type {NextFunction, Request, RequestHandler, Response} from 'express';
import type {IncomingMessage} from 'node:http';
import type {Duplex} from 'node:stream';
import {log} from './logger';
import {errors} from '../protocol';
export {handleIdempotency} from './idempotency';
import {match} from 'path-to-regexp';
import {util} from '@appium/support';
import {calcSignature} from '../helpers/session';
import {getResponseForW3CError} from '../protocol/errors';
import type {StringRecord, WSServer} from '@appium/types';

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
    'Cache-Control, Pragma, Origin, X-Requested-With, Content-Type, Accept, User-Agent'
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
  function allowCrossDomainAsyncExecuteHandler(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const receiveAsyncResponseRegExp = new RegExp(
      `${_.escapeRegExp(basePath)}/session/[a-f0-9-]+/(appium/)?receive_async_response`
    );
    if (!receiveAsyncResponseRegExp.test(req.url)) {
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

  const sessionId = SESSION_ID_PATTERN.exec(req.url)?.[1];
  const sessionInfo = sessionId ? {sessionId, sessionSignature: calcSignature(sessionId)} : {};
  const isSensitiveHeaderValue = fetchHeaderValue(req, 'x-appium-is-sensitive');

  log.updateAsyncContext(
    {
      requestId,
      ...sessionInfo,
      isSensitive: ['true', '1', 'yes'].includes(_.toLower(isSensitiveHeaderValue)),
    },
    true
  );

  next();
}

/**
 * Ensures requests default to JSON content-type when none is provided.
 */
export function defaultToJSONContentType(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.headers['content-type']) {
    req.headers['content-type'] = 'application/json; charset=utf-8';
  }
  next();
}

/**
 * Attempts to handle a WebSocket upgrade by matching the request path against registered handlers.
 *
 * @param req - Incoming HTTP request
 * @param socket - Network socket
 * @param head - First packet of the upgraded stream
 * @param webSocketsMapping - Path-to-WebSocket-server mapping
 * @returns `true` if the upgrade was handled; `false` otherwise
 */
export function tryHandleWebSocketUpgrade(
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  webSocketsMapping: StringRecord<WSServer>
): boolean {
  if (_.toLower(req.headers?.upgrade) !== 'websocket') {
    return false;
  }

  let currentPathname: string;
  try {
    currentPathname = new URL(req.url ?? '', 'http://localhost').pathname;
  } catch {
    currentPathname = req.url ?? '';
  }
  for (const [pathname, wsServer] of _.toPairs(webSocketsMapping)) {
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
 * @returns Express request handler
 */
export function handleUpgrade(webSocketsMapping: StringRecord<WSServer>): RequestHandler {
  function handleUpgradeMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (tryHandleWebSocketUpgrade(req, req.socket, Buffer.from(''), webSocketsMapping)) {
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
export function catchAllHandler(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  log.error(`Uncaught error: ${err.message}`);
  const [status, body] = getResponseForW3CError(err);
  res.status(status).json(body);
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
  return _.isArray(value) ? value[0] : (value as string | undefined);
}

