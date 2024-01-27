/**
 * It's a logger.
 *
 * Since this is a CLI app only, it doesn't necessarily make sense to consume `@appium/support`'s logger.
 *
 * @module
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires -- Consola 3 import call is ESM
const {ConsolaInstance, createConsola, LogLevel} = require('consola');
import _ from 'lodash';
import {DEFAULT_LOG_LEVEL, LogLevelMap} from './constants';

/**
 * The global log level
 *
 * "Global" inasmuch as any logger created from the root logger will use this level.
 */
let globalLevel: typeof LogLevel = LogLevelMap[DEFAULT_LOG_LEVEL];

/**
 * Type guard to see if a string is a recognized log level
 * @param level any value
 */
export function isLogLevelString(level: any): level is keyof typeof LogLevelMap {
  return level in LogLevelMap;
}

/**
 * The logger from which all loggers are created. This one uses a unique tag.
 */
const rootLogger = createConsola({
  defaults: {tag: 'docutils'},
  fancy: true,
  level: globalLevel,
  formatOptions: {
    colors: true,
    date: false,
  },
});
// this prevents logging before `initLogger` is called
rootLogger.pauseLogs();

/**
 * A map of tags to loggers
 */
const loggers: Map<string, WeakRef<typeof ConsolaInstance>> = new Map();

export function getLogger(tag: string, parent = rootLogger) {
  if (loggers.has(tag)) {
    const logger = loggers.get(tag)?.deref();
    if (logger) {
      return logger;
    }
  }
  const logger = parent.withTag(tag);
  logger.level = globalLevel;
  loggers.set(tag, new WeakRef(logger));
  return logger;
}

/**
 * Initialize the logging system.
 *
 * This should only be called once. The loglevel cannot be changed once it is set.
 *
 * @remarks Child loggers seem to inherit the "paused" state of the parent, so when this is called, we must resume all of them.
 */
export const initLogger = _.once((level: keyof typeof LogLevelMap | typeof LogLevel) => {
  globalLevel = isLogLevelString(level) ? LogLevelMap[level] : level;
  rootLogger.level = globalLevel;
  rootLogger.resumeLogs();
  for (const ref of loggers.values()) {
    const logger = ref.deref();
    if (logger) {
      logger.level = globalLevel;
      logger.resumeLogs();
    }
  }
});
