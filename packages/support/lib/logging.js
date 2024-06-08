// @ts-check

import globalLog from '@appium/logger';
import _ from 'lodash';
import moment from 'moment';

/** @type {import('@appium/types').AppiumLoggerLevel[]} */
export const LEVELS = ['silly', 'verbose', 'debug', 'info', 'http', 'warn', 'error'];
const MAX_LOG_RECORDS_COUNT = 3000;

const PREFIX_TIMESTAMP_FORMAT = 'HH-mm-ss:SSS';

// mock log object used in testing mode to silence the output
const MOCK_LOG = {
  unwrap: () => ({
    loadSecureValuesPreprocessingRules: () => ({
      issues: [],
      rules: [],
    }),
    level: '',
    prefix: '',
    log: _.noop,
  }),
  ...(_.fromPairs(LEVELS.map((l) => [l, _.noop]))),
};

/**
 *
 * @returns {[import('@appium/logger').Logger, boolean]}
 */
function _getLogger() {
  // check if the user set the `_TESTING` or `_FORCE_LOGS` flag
  const testingMode = process.env._TESTING === '1';
  const forceLogMode = process.env._FORCE_LOGS === '1';

  // if is possible that there is a logger instance that is already around,
  // in which case we want t o use that
  const usingGlobalLog = !!global._global_npmlog;
  let logger;
  if (testingMode && !forceLogMode) {
    // in testing mode, use a mock logger object that we can query
    logger = MOCK_LOG;
  } else {
    // otherwise, either use the global, or a new `npmlog` object
    logger = global._global_npmlog || globalLog;
    // The default value is 10000, which causes excessive memory usage
    logger.maxRecordSize = MAX_LOG_RECORDS_COUNT;
  }
  return [logger, usingGlobalLog];
}

/**
 * @param {AppiumLoggerPrefix?} prefix
 * @param {boolean} logTimestamp whether to include timestamps into log prefixes
 * @returns {string}
 */
function getActualPrefix(prefix, logTimestamp = false) {
  const result = (_.isFunction(prefix) ? prefix() : prefix) ?? '';
  return logTimestamp ? `[${moment().format(PREFIX_TIMESTAMP_FORMAT)}] ${result}` : result;
}

/**
 *
 * @param {AppiumLoggerPrefix?} prefix
 * @returns {AppiumLogger}
 */
function getLogger(prefix = null) {
  const [logger, usingGlobalLog] = _getLogger();

  // wrap the logger so that we can catch and modify any logging
  const wrappedLogger = {
    unwrap: () => logger,
    levels: LEVELS,
    prefix,
  };

  // allow access to the level of the underlying logger
  Object.defineProperty(wrappedLogger, 'level', {
    get() {
      return logger.level;
    },
    set(newValue) {
      logger.level = newValue;
    },
    enumerable: true,
    configurable: true,
  });

  const logTimestamp = process.env._LOG_TIMESTAMP === '1';

  // add all the levels from `npmlog`, and map to the underlying logger
  for (const level of LEVELS) {
    wrappedLogger[level] = /** @param {...any} args */ function (...args) {
      const actualPrefix = getActualPrefix(this.prefix, logTimestamp);
      // @ts-ignore This is OK
      logger[level](actualPrefix, ...args);
    };
  }
  wrappedLogger.errorWithException = function (/** @type {any[]} */ ...args) {
    this.error(...args);
    // make sure we have an `Error` object. Wrap if necessary
    return _.isError(args[0]) ? args[0] : new Error(args.join('\n'));
  };
  /**
   * @deprecated Use {@link errorWithException} instead
   */
  wrappedLogger.errorAndThrow = function (/** @type {any[]} */ ...args) {
    throw this.errorWithException(args);
  };
  if (!usingGlobalLog) {
    // if we're not using a global log specified from some top-level package,
    // set the log level to a default of verbose. Otherwise, let the top-level
    // package set the log level
    wrappedLogger.level = 'verbose';
  }
  return /** @type {AppiumLogger} */ (wrappedLogger);
}

// export a default logger with no prefix
const log = getLogger();

export {log, getLogger};
export default log;

/**
 * @typedef {import('@appium/types').AppiumLoggerPrefix} AppiumLoggerPrefix
 * @typedef {import('@appium/types').AppiumLogger} AppiumLogger
 * @typedef {import('@appium/types').AppiumLoggerLevel} AppiumLoggerLevel
 */
