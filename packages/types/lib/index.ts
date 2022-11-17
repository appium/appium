import type {Express} from 'express';
import type {Server} from 'http';
import type {Socket} from 'net';
import type {Logger} from 'npmlog';
import type {Class as _Class, ConditionalPick, MultidimensionalReadonlyArray} from 'type-fest';
import type {Server as WSServer} from 'ws';
import {ServerArgs} from './config';

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
  addWebSocketHandler(handlerPathname: string, handlerServer: WSServer): Promise<void>;
  removeWebSocketHandler(handlerPathname: string): Promise<boolean>;
  removeAllWebSocketHandlers(): Promise<boolean>;
  getWebSocketHandlers(keysFilter: string | null | undefined): Promise<Record<string, WSServer>>;
  webSocketsMapping: Record<string, WSServer>;
}

export interface AppiumServerSocket extends Socket {
  _openReqCount: number;
}

/**
 * The definition of an extension method, which will be provided via Appium's API.
 *
 */
export interface MethodDef<Ext> {
  /**
   * Name of the command.
   */
  readonly command?: keyof ConditionalPick<Required<Ext>, DriverCommand>;
  /**
   * If true, this `Method` will never proxy.
   */
  readonly neverProxy?: boolean;
  /**
   * Specifies shape of payload
   */
  readonly payloadParams?: PayloadParams;
}

/**
 * An instance method of a driver class, whose name may be referenced by {@linkcode MethodDef.command}, and serves as an Appium command.
 *
 * Note that this signature differs from a `PluginCommand`.
 */
export type DriverCommand<TArgs = any, TRetval = unknown> = (...args: TArgs[]) => Promise<TRetval>;

/**
 * Defines the shape of a payload for a {@linkcode MethodDef}.
 */
export interface PayloadParams {
  wrap?: string;
  unwrap?: string;
  required?: ReadonlyArray<string> | MultidimensionalReadonlyArray<string, 2>;
  optional?: ReadonlyArray<string> | MultidimensionalReadonlyArray<string, 2>;
  validate?: (obj: any, protocol: string) => boolean | string | undefined;
  makeArgs?: (obj: any) => any;
}
/**
 * A mapping of URL paths to HTTP methods to {@linkcode MethodDef}s.
 */
export type MethodMap<Ext = any> = Readonly<
  Record<
    string,
    {
      GET?: MethodDef<Ext>;
      POST?: MethodDef<Ext>;
      DELETE?: MethodDef<Ext>;
    }
  >
>;

/**
 * Wraps {@linkcode _Class `type-fest`'s `Class`} to include static members.
 */
export type Class<
  Proto,
  StaticMembers extends object = {},
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
