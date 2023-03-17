/**
 * Adapted from `@knodes/typedoc-pluginutils`
 *
 * Portions Copyright (c) 2022 KnodesCommunity
 * Licensed MIT
 *
 * @module
 * @see https://github.com/KnodesCommunity/typedoc-plugins/blob/ed5e4e87f5d80abf6352e8de353ea376c4f7db6d/packages/pluginutils/src/plugin-logger.ts
 *
 */

import _ from 'lodash';
import {format} from 'node:util';
import {Logger, LogLevel} from 'typedoc';
import path from 'path';

// this is a hack to get around package export restrictions.
// since TypeDoc's ConsoleLogger is a private API, we will fall back to a vanilla `Logger`;
// I'm not entirely sure what it will do.
let ConsoleLogger: typeof Logger;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ConsoleLogger = require(path.join(
    path.dirname(require.resolve('typedoc/package.json')),
    'dist',
    'lib',
    'utils'
  )).ConsoleLogger;
} catch {
  ConsoleLogger = Logger;
}

/**
 * Mapping of TypeDoc {@linkcode LogLevel}s to method names.
 */
const LogMethods: Readonly<
  Map<LogLevel, keyof Pick<Logger, 'error' | 'warn' | 'info' | 'verbose'>>
> = new Map([
  [LogLevel.Error, 'error'],
  [LogLevel.Warn, 'warn'],
  [LogLevel.Info, 'info'],
  [LogLevel.Verbose, 'verbose'],
]);

export class AppiumPluginLogger extends Logger {
  /**
   * Function provided by `AppiumPluginLogger` parent loggers to log through them.
   */
  readonly #logThroughParent?: AppiumPluginParentLogger;
  /**
   * Parent logger
   */
  readonly #parent: Logger;

  /**
   * Namespace to prepend to log messages
   */
  public readonly ns: string;

  public constructor(logger: Logger, ns: string, logThroughParent?: AppiumPluginParentLogger) {
    super();
    this.#parent = logger;
    this.ns = ns;
    this.level = this.#parent.level;
    this.#logThroughParent = logThroughParent;
  }

  /**
   * Creates or retrieves a child logger for the given namespace
   * @param parent Parent logger
   * @param ns Namespace
   * @returns Child logger
   */
  static createChildLogger = _.memoize(
    (parent: AppiumPluginLogger, ns: string) => {
      const newLogger = new AppiumPluginLogger(
        parent.#parent,
        `${parent.ns}:${ns}`,
        parent.#logThrough.bind(parent)
      );
      newLogger.level = parent.level;
      return newLogger;
    },
    (parent: AppiumPluginLogger, ns: string) => `${parent.ns}:${ns}`
  );

  /**
   * Create a new {@link AppiumPluginLogger} for the given context.
   *
   * @param ns - New sub-namespace; will be appended to the current namespace.
   * @returns the new logger.
   */
  public createChildLogger(ns: string) {
    return AppiumPluginLogger.createChildLogger(this, ns);
  }

  /**
   * Log the given error message.
   *
   * @param text  - The error that should be logged.
   */
  public error(text: string, ...args: any[]): void {
    this.#log(LogLevel.Error, text, ...args);
  }

  /**
   * Log the given info message.
   *
   * @param text  - The message that should be logged.
   */
  public info(text: string, ...args: any[]): void {
    this.#log(LogLevel.Info, text, ...args);
  }

  /**
   * Print a log message.
   *
   * Does _not_ support `printf`-style syntax for compatibility with {@linkcode Logger}.
   *
   * @param text  - The message itself.
   * @param level  - The urgency of the log message.
   */
  public log(text: string, level: LogLevel): void {
    this.#log(level, text);
  }

  /**
   * Log the given verbose message.
   *
   * @param text - The message that should be logged.
   */
  public verbose(text: string, ...args: any): void {
    this.#log(LogLevel.Verbose, text, ...args);
  }

  /**
   * Log the given warning message.
   *
   * @param text - The warning that should be logged.
   */
  public warn(text: string, ...args: any[]): void {
    this.#log(LogLevel.Warn, text, ...args);
  }

  /**
   * Format the given message.
   *
   * Uses the `util.format` function to format the message.
   *
   * @param ns - Namespace
   * @param message - The message to format.
   * @returns the formatted message;
   */
  #formatMessage(ns: string, message: string, ...args: any[]) {
    return format(`[${ns}] ${message}`, ...args);
  }

  /**
   * Print a log message.
   *
   * @param text - The message itself.
   * @param level - The urgency of the log message.
   */
  #log(level: LogLevel, text: string, ...args: any[]): void {
    if (level < this.level) {
      return;
    }
    this.#logThrough(level, this.ns, text, ...args);
  }

  /**
   * Pass a log message to the parent.
   *
   * @param level - The urgency of the log message.
   * @param message - The message itself.
   */
  #logThrough(level: LogLevel, ns: string, message: string, ...args: any[]) {
    if (this.#logThroughParent) {
      this.#logThroughParent(level, ns, message, ...args);
    } else {
      const parentMethod = LogMethods.get(level)!;
      this.#parent[parentMethod](this.#formatMessage(ns, message, ...args));
    }
  }
}

/**
 * Used internally by {@link AppiumPluginLogger.createChildLogger} to pass log messages to the parent.
 */
export type AppiumPluginParentLogger = (level: LogLevel, message: string, ...args: any[]) => void;

/**
 * Fallback logger. **Do not use this unless you really mean it.**
 *
 * Prefer to pass a `Logger` or `AppiumPluginLogger` instance to the constructor of the class you
 * are using or the function you are calling.  If this makes the API too cumbersome, consider using this.
 */
export const fallbackLogger = new AppiumPluginLogger(new ConsoleLogger(), 'appium');
