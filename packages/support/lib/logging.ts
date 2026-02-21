import globalLog, {
  markSensitive as _markSensitive,
  type Logger,
} from '@appium/logger';
import type {
  AppiumLogger,
  AppiumLoggerContext,
  AppiumLoggerLevel,
  AppiumLoggerPrefix,
} from '@appium/types';
import _ from 'lodash';

export const LEVELS: readonly AppiumLoggerLevel[] = [
  'silly',
  'verbose',
  'debug',
  'info',
  'http',
  'warn',
  'error',
];

const MAX_LOG_RECORDS_COUNT = 3000;

interface GlobalWithNpmlog {
  _global_npmlog?: Logger;
}

const globalWithNpmlog = globalThis as typeof globalThis & GlobalWithNpmlog;

// mock log object is used in testing mode to silence the output
const MOCK_LOG = {
  unwrap: () => ({
    loadSecureValuesPreprocessingRules: () =>
      Promise.resolve({issues: [], rules: []}),
    level: 'verbose',
    prefix: '',
    log: _.noop,
  }),
  ...(_.fromPairs(LEVELS.map((l) => [l, _.noop])) as Record<
    AppiumLoggerLevel,
    (...args: any[]) => void
  >),
} as unknown as Logger;

export const log = getLogger();

/**
 * @param prefix - Optional log prefix
 * @returns A wrapped Appium logger instance
 */
export function getLogger(prefix: AppiumLoggerPrefix | null = null): AppiumLogger {
  const {logger, defaultToVerbose} = _getLogger();

  const wrappedLogger = {
    unwrap: () => logger,
    levels: [...LEVELS],
    prefix: prefix ?? undefined,
    errorWithException(...args: any[]) {
      this.error(...args);
      return _.isError(args[0]) ? args[0] : new Error(args.join('\n'));
    },
    errorAndThrow(...args: any[]) {
      throw this.errorWithException(...args);
    },
    updateAsyncContext(contextInfo: AppiumLoggerContext, replace = false) {
      this.unwrap().updateAsyncStorage?.(contextInfo, replace);
    },
  } as AppiumLogger;

  Object.defineProperty(wrappedLogger, 'level', {
    get() {
      return logger.level;
    },
    set(newValue: string) {
      logger.level = newValue;
    },
    enumerable: true,
    configurable: true,
  });

  const isDebugTimestampLoggingEnabled = process.env._LOG_TIMESTAMP === '1';

  for (const level of LEVELS) {
    wrappedLogger[level] = function (
      this: typeof wrappedLogger,
      ...args: any[]
    ) {
      const finalPrefix = getFinalPrefix(
        this.prefix,
        isDebugTimestampLoggingEnabled
      );
      if (args.length) {
        (logger as Record<string, (...a: any[]) => void>)[level](
          finalPrefix,
          ...args
        );
      } else {
        (logger as Record<string, (...a: any[]) => void>)[level](
          finalPrefix,
          ''
        );
      }
    };
  }

  // Default to verbose when the global was not already set (first use, or standalone);
  // main server will override later.
  if (defaultToVerbose) {
    wrappedLogger.level = 'verbose';
  }

  return wrappedLogger;
}

/**
 * Marks arbitrary log message as sensitive.
 * This message will then be replaced with the default replacer
 * while being logged by any `info`, `debug`, etc. methods if the
 * asyncStorage has `isSensitive` flag enabled in its async context.
 * The latter is enabled by the corresponding HTTP middleware
 * in response to the `X-Appium-Is-Sensitive` request header
 * being set to 'true'.
 */
export function markSensitive<T>(logMessage: T): {[k: string]: T} {
  return _markSensitive(logMessage);
}

function _getLogger(): {logger: Logger; defaultToVerbose: boolean} {
  const testingMode = process.env._TESTING === '1';
  const forceLogMode = process.env._FORCE_LOGS === '1';
  const defaultToVerbose = !globalWithNpmlog._global_npmlog;
  const logger: Logger = testingMode && !forceLogMode
    ? MOCK_LOG
    : (globalWithNpmlog._global_npmlog ?? globalLog);
  if (!testingMode && defaultToVerbose && logger === globalLog) {
    globalWithNpmlog._global_npmlog = globalLog;
    logger.maxRecordSize = MAX_LOG_RECORDS_COUNT;
  }
  return {logger, defaultToVerbose};
}

function getFinalPrefix(
  prefix: AppiumLoggerPrefix | null | undefined,
  shouldLogTimestamp = false
): string {
  const result = (_.isFunction(prefix) ? prefix() : prefix) ?? '';
  if (!shouldLogTimestamp) {
    return result;
  }
  const now = new Date();
  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  const formattedTimestamp = `[${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}:${pad(now.getMilliseconds(), 3)}]`;
  return result ? `${formattedTimestamp} ${result}` : formattedTimestamp;
}

export default log;
