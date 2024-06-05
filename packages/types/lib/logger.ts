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
   */
  errorAndThrow(...args: any[]): never;
  errorWithException(...args: any[]): Error;
}
