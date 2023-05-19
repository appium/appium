/**
 * It's a logger.
 *
 * Since this is a CLI app only, it doesn't necessarily make sense to consume `@appium/support`'s logger.
 *
 * @module
 */

import chalk, {type BackgroundColor, type ForegroundColor} from 'chalk';
import consola, {
  type Consola,
  type ConsolaReporterLogObject,
  FancyReporter,
  type FancyReporterOptions,
  type LogLevel,
  type logType as LogType,
} from 'consola';
import figures from 'figures';
import _ from 'lodash';
import logSymbols from 'log-symbols';
import {DEFAULT_LOG_LEVEL, LogLevelMap} from './constants';

/**
 * This is a reporter for `consola` which uses some extra/custom icons and colors.
 *
 * @privateRemarks
 * I did not like that the default `FancyReport` logs errors in _green_ without any sort of icon.
 * Both `log-symbols` and `consola` consume `chalk`, so we do too. `consola` also depends on `figures`.
 */
class DocutilsReporter extends FancyReporter {
  /**
   * Mapping of log types (the name of the logging method called) to chalk fg colors
   */
  static readonly TYPE_COLOR_MAP = {
    info: 'cyan',
    success: 'green',
    error: 'red',
    warn: 'yellow',
  } satisfies {[k in LogType]?: typeof ForegroundColor};

  /**
   * Mapping of log levels to chalk fg colors
   */
  static readonly LEVEL_COLORS = {
    0: 'red',
    1: 'yellow',
    2: 'white',
    3: 'green',
  } satisfies {[k in LogLevel]?: typeof ForegroundColor};

  /**
   * Mapping of log types to icons/symbols
   */
  static readonly TYPE_ICONS = {
    info: logSymbols.info,
    success: logSymbols.success,
    error: logSymbols.error,
    warn: logSymbols.warning,
    debug: figures('›'),
    trace: figures('›'),
  } satisfies {[k in LogType]?: string};

  /**
   * Default color to use if we can't find a color for the log type or level
   */
  static readonly DEFAULT_COLOR = 'grey';

  /**
   * Type guard to check if a log type has a color
   * @param type A log type
   */
  static hasTypeColor(type: LogType): type is keyof typeof DocutilsReporter.TYPE_COLOR_MAP {
    return type in DocutilsReporter.TYPE_COLOR_MAP;
  }

  /**
   * Type guard to check if a log level has a color
   * @param level A log level
   */
  static hasLevelColor(level: LogLevel): level is keyof typeof DocutilsReporter.LEVEL_COLORS {
    return level in DocutilsReporter.LEVEL_COLORS;
  }

  /**
   * Type guard to check if a log type has an icon
   * @param type A log type
   */
  static hasTypeIcon(type: LogType): type is keyof typeof DocutilsReporter.TYPE_ICONS {
    return type in DocutilsReporter.TYPE_ICONS;
  }

  /**
   * Prefixes the logging output with colors and symbols, depending on contents of `logObj`.
   * @param logObj Consola's log object
   * @param isBadge {@linkcode FancyReporter} uses this; I think it depends on the terminal width
   * @returns
   */
  protected override formatType(logObj: ConsolaReporterLogObject, isBadge?: boolean): string {
    const {
      TYPE_COLOR_MAP,
      LEVEL_COLORS,
      TYPE_ICONS,
      hasTypeColor,
      hasLevelColor,
      hasTypeIcon,
      DEFAULT_COLOR,
    } = DocutilsReporter;

    let typeColor: typeof ForegroundColor;
    if (hasTypeColor(logObj.type)) {
      typeColor = TYPE_COLOR_MAP[logObj.type];
    } else if (hasLevelColor(logObj.level)) {
      typeColor = LEVEL_COLORS[logObj.level];
    } else {
      typeColor = <typeof ForegroundColor>(
        ((this.options as FancyReporterOptions).secondaryColor ?? DEFAULT_COLOR)
      );
    }

    if (isBadge) {
      return chalk[('bg' + _.capitalize(typeColor)) as typeof BackgroundColor].black(
        ` ${_.toUpper(logObj.type)}`
      );
    }

    const type = hasTypeIcon(logObj.type) ? TYPE_ICONS[logObj.type] : logObj.type;
    return type ? chalk[typeColor](type) : '';
  }
}

/**
 * The global log level
 *
 * "Global" inasmuch as any logger created from the root logger will use this level.
 */
let globalLevel: LogLevel = LogLevelMap[DEFAULT_LOG_LEVEL];

/**
 * Type guard to see if a string is a recognized log level
 * @param level any value
 */
export function isLogLevelString(level: any): level is keyof typeof LogLevelMap {
  return level in LogLevelMap;
}

/**
 * The logger from which all loggers are created.  This one uses a unique tag and our custom reporter.
 */
const rootLogger = consola.create({
  defaults: {tag: 'docutils'},
  reporters: [new DocutilsReporter()],
  level: globalLevel,
});
// this prevents logging before `initLogger` is called
rootLogger.pause();

/**
 * A map of tags to loggers
 */
const loggers: Map<string, WeakRef<Consola>> = new Map();

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
export const initLogger = _.once((level: keyof typeof LogLevelMap | LogLevel) => {
  globalLevel = isLogLevelString(level) ? LogLevelMap[level] : level;
  rootLogger.level = globalLevel;
  rootLogger.resume();
  for (const ref of loggers.values()) {
    const logger = ref.deref();
    if (logger) {
      logger.level = globalLevel;
      logger.resume();
    }
  }
});
