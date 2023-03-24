import type {Express} from 'express';
import type {Server as WSServer} from 'ws';
import type {Server as HTTPServer} from 'node:http';
import type {Socket} from 'node:net';
import {ServerArgs} from './config';

/**
 * Appium's slightly-modified {@linkcode HTTPServer http.Server}.
 */
export type AppiumServer = Omit<HTTPServer, 'close'> & AppiumServerExtension;

export interface AppiumServerExtension {
  close(): Promise<void>;
  /**
   * Adds websocket handler to an {@linkcode AppiumServer}.
   * @param handlerPathname - Web socket endpoint path starting with a single slash character. It is recommended to always prepend `/ws` to all web socket pathnames.
   * @param handlerServer - WebSocket server instance. See https://github.com/websockets/ws/pull/885 for more details on how to configure the handler properly.
   */
  addWebSocketHandler(
    this: AppiumServer,
    handlerPathname: string,
    handlerServer: WSServer
  ): Promise<void>;
  /**
   * Removes existing WebSocket handler from the server instance.
   *
   * The call is ignored if the given `handlerPathname` handler is not present in the handlers list.
   * @param handlerPathname - WebSocket endpoint path
   * @returns `true` if the `handlerPathname` was found and deleted; `false` otherwise.
   */
  removeWebSocketHandler(this: AppiumServer, handlerPathname: string): Promise<boolean>;
  /**
   * Removes all existing WebSocket handlers from the server instance.
   * @returns `true` if at least one handler was deleted; `false` otherwise.
   */
  removeAllWebSocketHandlers(this: AppiumServer): Promise<boolean>;
  /**
   * Returns web socket handlers registered for the given server
   * instance.
   * @param keysFilter - Only include pathnames with given value if set. All pairs will be included by default.
   * @returns Pathnames to WS server instances mapping matching the search criteria, if any found.
   */
  getWebSocketHandlers(
    this: AppiumServer,
    keysFilter?: string | null
  ): Promise<Record<string, WSServer>>;
  webSocketsMapping: Record<string, WSServer>;
}

export interface AppiumServerSocket extends Socket {
  _openReqCount: number;
}

export {WSServer};

/**
 * Optionally updates an Appium express app and http server, by calling
 * methods that may mutate those objects. For example, you could call:
 *
 * `expressApp.get('/foo', handler)`
 *
 * In order to add a new route to Appium with this plugin. Or, you could add
 * new listeners to the httpServer object.
 *
 * @param expressApp - the Express 'app' object used by Appium for route handling
 * @param httpServer - the node HTTP server that hosts the app
 * @param cliArgs - Arguments from config files, CLI, etc.
 */
export type UpdateServerCallback = (
  expressApp: Express,
  httpServer: AppiumServer,
  cliArgs: Partial<ServerArgs>
) => Promise<void>;
