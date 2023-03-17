import type {Express} from 'express';
import type {Server} from 'http';
import type {Socket} from 'net';
import type {Logger} from 'npmlog';
import type {Class as _Class} from 'type-fest';
import type {Server as WSServer} from 'ws';
import {ServerArgs} from './config';
export * from './command';
export * from './action';
export * from './appium-config';
export * from './capabilities';
export * from './config';
export {BASE_DESIRED_CAP_CONSTRAINTS} from './constraints';
export type {BaseDriverCapConstraints} from './constraints';
export * from './driver';
export * from './plugin';

/**
 * Utility type for a object with string-only props
 */
export type StringRecord = Record<string, any>;

/**
 * A log prefix for {@linkcode AppiumLogger}
 *
 * If a function, the function will return the prefix.  Log messages will be prefixed with this value.
 */
export type AppiumLoggerPrefix = string | (() => string);

/**
 * Possible "log levels" for {@linkcode AppiumLogger}.
 *
 * Extracted from `npmlog`.
 */
export type AppiumLoggerLevel = 'silly' | 'verbose' | 'debug' | 'info' | 'http' | 'warn' | 'error';

/**
 * Describes the `npmlog`-based internal logger.
 *
 * @see https://npm.im/npmlog
 */
export interface AppiumLogger {
  /**
   * Returns the underlying `npmlog` {@link Logger}.
   */
  unwrap(): Logger;
  level: AppiumLoggerLevel;
  levels: AppiumLoggerLevel[];
  /**
   * Log prefix, if applicable.
   */
  prefix?: AppiumLoggerPrefix;
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  verbose(...args: any[]): void;
  silly(...args: any[]): void;
  http(...args: any[]): void;
  errorAndThrow(...args: any[]): never;
}

/**
 * Appium's slightly-modified {@linkcode Server http.Server}.
 */
export type AppiumServer = Omit<Server, 'close'> & AppiumServerExtension;

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

/**
 * Wraps {@linkcode _Class `type-fest`'s `Class`} to include static members.
 */
export type Class<
  Proto,
  StaticMembers extends object = object,
  Args extends unknown[] = any[]
> = _Class<Proto, Args> & StaticMembers;

/**
 * The string referring to a "driver"-type extension
 */
export type DriverType = 'driver';

/**
 * The string referring to a "plugin"-type extension
 *
 */
export type PluginType = 'plugin';

/**
 * The strings referring to all extension types.
 */
export type ExtensionType = DriverType | PluginType;

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

/**
 * Possible HTTP methods, as stolen from `axios`.
 *
 * @see https://npm.im/axios
 */
export type HTTPMethod =
  | 'get'
  | 'GET'
  | 'delete'
  | 'DELETE'
  | 'head'
  | 'HEAD'
  | 'options'
  | 'OPTIONS'
  | 'post'
  | 'POST'
  | 'put'
  | 'PUT'
  | 'patch'
  | 'PATCH'
  | 'purge'
  | 'PURGE'
  | 'link'
  | 'LINK'
  | 'unlink'
  | 'UNLINK';

export {WSServer};
