import type {Server as WSServer} from 'ws';
import type {Socket} from 'net';
import type {Server} from 'http';
import type {Class as _Class, ConditionalPick, MultidimensionalReadonlyArray} from 'type-fest';
import {ServerArgs} from './config';
import type {Express} from 'express';
import {ExternalDriver} from './driver';
import type {Logger} from 'npmlog';

export * from './driver';
export * from './action';
export * from './plugin';
export * from './capabilities';
export * from './constraints';
export * from './config';
export * from './appium-config';

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
export interface Method<T> {
  /**
   * Name of the command.
   */
  command?: keyof ConditionalPick<Required<T>, DriverCommand>;
  /**
   * If true, this `Method` will never proxy.
   */
  neverProxy?: boolean;
  /**
   * Specifies shape of payload
   */
  payloadParams?: PayloadParams;
}

/**
 * An instance method of a driver class, whose name may be referenced by {@linkcode Method.command}, and serves as an Appium command.
 *
 * Note that this signature differs from a `PluginCommand`.
 */
export type DriverCommand<TArgs = any, TRetval = unknown> = (...args: TArgs[]) => Promise<TRetval>;

/**
 * Defines the shape of a payload for a {@linkcode Method}.
 */
export interface PayloadParams {
  wrap?: string;
  unwrap?: string;
  required?: Readonly<string[]> | MultidimensionalReadonlyArray<string, 2>;
  optional?: Readonly<string[]> | MultidimensionalReadonlyArray<string, 2>;
  validate?: (obj: any, protocol: string) => boolean | string | undefined;
  makeArgs?: (obj: any) => any;
}
/**
 * A mapping of URL paths to HTTP methods to {@linkcode Method}s.
 *
 * @todo Should use {@linkcode HTTPMethod} here
 */
export type MethodMap<Extension = ExternalDriver> = Record<
  string,
  Record<string, Method<Extension & ExternalDriver>>
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
  cliArgs: ServerArgs
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
