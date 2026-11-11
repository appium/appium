import type {IncomingMessage} from 'node:http';
import type {Duplex} from 'node:stream';

import type {StringRecord, WSServer} from '@appium/types';
import type {NextFunction, Request, RequestHandler, Response} from 'express';
import {match} from 'path-to-regexp';

import {log} from '../logger.js';

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
