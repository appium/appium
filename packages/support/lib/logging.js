// @ts-check

import npmlog from 'npmlog';
import _ from 'lodash';
import {unleakString} from './util';
import moment from 'moment';
import SECURE_VALUES_PREPROCESSOR from './log-internal';

/** @type {import('@appium/types').AppiumLoggerLevel[]} */
export const LEVELS = ['silly', 'verbose', 'debug', 'info', 'http', 'warn', 'error'];
const MAX_LOG_RECORDS_COUNT = 3000;

const PREFIX_TIMESTAMP_FORMAT = 'HH-mm-ss:SSS';

// mock log object used in testing mode
let mockLog = {};
for (let level of LEVELS) {
  mockLog[level] = () => {};
}

/**
 *
 * @param {import('npmlog').Logger} logger
 */
function patchLogger(logger) {
  if (!logger.debug) {
    logger.addLevel('debug', 1000, {fg: 'blue', bg: 'black'}, 'dbug');
  }
}

/**
 *
 * @returns {[import('npmlog').Logger, boolean]}
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
    logger = mockLog;
  } else {
    // otherwise, either use the global, or a new `npmlog` object
    logger = global._global_npmlog || npmlog;
    // The default value is 10000, which causes excessive memory usage
    logger.maxRecordSize = MAX_LOG_RECORDS_COUNT;
  }
  patchLogger(logger);
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
  let [logger, usingGlobalLog] = _getLogger();

  // wrap the logger so that we can catch and modify any logging
  let wrappedLogger = {
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
      for (const arg of args) {
        const out = _.isError(arg) && arg.stack ? arg.stack : `${arg}`;
        for (const line of out.split('\n')) {
          // it is necessary to unleak each line because `split` call
          // creates "views" to the original string as well as the `substring` one
          const unleakedLine = unleakString(line);
          logger[level](actualPrefix, SECURE_VALUES_PREPROCESSOR.preprocess(unleakedLine));
        }
      }
    };
  }
  wrappedLogger.errorWithException = function (/** @type {any[]} */ ...args) {
    this.error(...args);
    // make sure we have an `Error` object. Wrap if necessary
    return _.isError(args[0]) ? args[0] : new Error(args.map(unleakString).join('\n'));
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

/**
 * @typedef LoadResult
 * @property {string[]} issues The list of rule parsing issues (one item per rule).
 * Rules with issues are skipped. An empty list is returned if no parsing issues exist.
 * @property {import('./log-internal').SecureValuePreprocessingRule[]} rules The list of successfully loaded
 * replacement rules. The list could be empty if no rules were loaded.
 */

/**
 * Loads the JSON file containing secure values replacement rules.
 * This might be necessary to hide sensitive values that may possibly
 * appear in Appium logs.
 * Each call to this method replaces the previously loaded rules if any existed.
 *
 * @param {string|string[]|import('@appium/types').LogFiltersConfig} rulesJsonPath The full path to the JSON file containing
 * the replacement rules. Each rule could either be a string to be replaced
 * or an object with predefined properties.
 * @throws {Error} If the given file cannot be loaded
 * @returns {Promise<LoadResult>}
 */
async function loadSecureValuesPreprocessingRules(rulesJsonPath) {
  const issues = await SECURE_VALUES_PREPROCESSOR.loadRules(rulesJsonPath);
  return {
    issues,
    rules: _.cloneDeep(SECURE_VALUES_PREPROCESSOR.rules),
  };
}

// export a default logger with no prefix
const log = getLogger();

export {log, patchLogger, getLogger, loadSecureValuesPreprocessingRules};
export default log;

/**
 * @typedef {import('@appium/types').AppiumLoggerPrefix} AppiumLoggerPrefix
 * @typedef {import('@appium/types').AppiumLogger} AppiumLogger
 * @typedef {import('@appium/types').AppiumLoggerLevel} AppiumLoggerLevel
 */
