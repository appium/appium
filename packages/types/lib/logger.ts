import type {Logger} from '@appium/logger';

/**
 * A log prefix for {@linkcode AppiumLogger}
 *
 * If a function, the function will return the prefix.  Log messages will be prefixed with this value.
 */
export type AppiumLoggerPrefix = string | (() => string);

/**
 * Possible "log levels" for {@linkcode AppiumLogger}.
 */
export type AppiumLoggerLevel = 'silly' | 'verbose' | 'debug' | 'info' | 'http' | 'warn' | 'error';


export type AppiumLoggerContext = {
  idempotencyKey?: string;
  requestId?: string;
  sessionId?: string;
  sessionSignature?: string;
  [key: string]: any
}

/**
 * Describes the internal logger.
 */
export interface AppiumLogger {
  /**
   * Returns the underlying `logger` {@link Logger}.
   * ! This method is designed for private usage.
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
  /**
   * @deprecated Use {@link errorWithException} instead
   * @param {...any} args
   * @throws {Error}
   */
  errorAndThrow(...args: any[]): never;
  /**
   * Logs given arguments at the error level and returns
   * the error object.
   *
   * @param  {...any} args
   * @returns {Error}
   */
  errorWithException(...args: any[]): Error;
  /**
   * Assign context values to be used in the entire current asynchronous context for logging.
   *
   * @param {AppiumLoggerContext} contextInfo key-value pairs to be added to the context
   * @param {boolean} [replace=false] if true, replace the existing context info object(default: false)
   */
  updateCurrentContext(contextInfo: AppiumLoggerContext, replace?: boolean): void;
}
