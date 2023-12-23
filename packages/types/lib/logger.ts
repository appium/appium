import type {Logger} from 'npmlog';

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
  /**
   * @deprecated Use {@link errorWithException} instead
   */
  errorAndThrow(...args: any[]): never;
  errorWithException(...args: any[]): Error;
}
