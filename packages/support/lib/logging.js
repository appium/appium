import npmlog from 'npmlog';
import _ from 'lodash';
import { unleakString } from './util';
import moment from 'moment';
import SECURE_VALUES_PREPROCESSOR from './log-internal';

// levels that are available from `npmlog`
const NPM_LEVELS = ['silly', 'verbose', 'debug', 'info', 'http', 'warn', 'error'];
const MAX_LOG_RECORDS_COUNT = 3000;

const PREFIX_TIMESTAMP_FORMAT = 'HH-mm-ss:SSS';

// mock log object used in testing mode
let mockLog = {};
for (let level of NPM_LEVELS) {
  mockLog[level] = () => {};
}

function patchLogger (logger) {
  if (!logger.debug) {
    logger.addLevel('debug', 1000, { fg: 'blue', bg: 'black' }, 'dbug');
  }
}

function _getLogger () {
  // check if the user set the `_TESTING` or `_FORCE_LOGS` flag
  const testingMode = parseInt(process.env._TESTING, 10) === 1;
  const forceLogMode = parseInt(process.env._FORCE_LOGS, 10) === 1;

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

function getActualPrefix (prefix, logTimestamp = false) {
  let actualPrefix = _.isFunction(prefix) ? prefix() : prefix;
  if (logTimestamp) {
    actualPrefix = `[${moment().format(PREFIX_TIMESTAMP_FORMAT)}] ${actualPrefix}`;
  }
  return actualPrefix;
}

function getLogger (prefix = null) {
  let [logger, usingGlobalLog] = _getLogger();

  // wrap the logger so that we can catch and modify any logging
  let wrappedLogger = {unwrap: () => logger};

  // allow access to the level of the underlying logger
  Object.defineProperty(wrappedLogger, 'level', {
    get () {
      return logger.level;
    },
    set (newValue) {
      logger.level = newValue;
    },
    enumerable: true,
    configurable: true
  });

  const logTimestamp = parseInt(process.env._LOG_TIMESTAMP, 10) === 1;

  // add all the levels from `npmlog`, and map to the underlying logger
  for (const level of NPM_LEVELS) {
    wrappedLogger[level] = function (...args) {
      const actualPrefix = getActualPrefix(prefix, logTimestamp);
      for (const arg of args) {
        const out = (_.isError(arg) && arg.stack) ? arg.stack : `${arg}`;
        for (const line of out.split('\n')) {
          // it is necessary to unleak each line because `split` call
          // creates "views" to the original string as well as the `substring` one
          const unleakedLine = unleakString(line);
          logger[level](actualPrefix, SECURE_VALUES_PREPROCESSOR.preprocess(unleakedLine));
        }
      }
    };
  }
  // add method to log an error, and throw it, for convenience
  wrappedLogger.errorAndThrow = function (err) {
    this.error(err);
    // make sure we have an `Error` object. Wrap if necessary
    throw (_.isError(err) ? err : new Error(unleakString(err)));
  };
  if (!usingGlobalLog) {
    // if we're not using a global log specified from some top-level package,
    // set the log level to a default of verbose. Otherwise, let the top-level
    // package set the log level
    wrappedLogger.level = 'verbose';
  }
  wrappedLogger.levels = NPM_LEVELS;
  return wrappedLogger;
}

/**
 * @typedef {Object} LoadResult
 * @property {List<string>} issues The list of rule parsing issues (one item per rule).
 * Rules with issues are skipped. An empty list is returned if no parsing issues exist.
 * @property {List<SecureValuePreprocessingRule>} rules The list of successfully loaded
 * replacement rules. The list could be empty if no rules were loaded.
 */

/**
 * Loads the JSON file containing secure values replacement rules.
 * This might be necessary to hide sensitive values that may possibly
 * appear in Appium logs.
 * Each call to this method replaces the previously loaded rules if any existed.
 *
 * @param {string} rulesJsonPath The full path to the JSON file containing
 * the replacement rules. Each rule could either be a string to be replaced
 * or an object with predefined properties. See the `Rule` type definition in
 * `log-internals.js` to get more details on its format.
 * @throws {Error} If the given file cannot be loaded
 * @returns {LoadResult}
 */
async function loadSecureValuesPreprocessingRules (rulesJsonPath) {
  const issues = await SECURE_VALUES_PREPROCESSOR.loadRules(rulesJsonPath);
  return {
    issues,
    rules: _.cloneDeep(SECURE_VALUES_PREPROCESSOR.rules),
  };
}

// export a default logger with no prefix
const log = getLogger();

export { log, patchLogger, getLogger, loadSecureValuesPreprocessingRules };
export default log;
