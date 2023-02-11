/**
 * It's a logger.
 *
 * Since this is a CLI app only, it doesn't necessarily make sense to consume `@appium/support`'s logger.
 *
 * @module
 */

import figures from 'figures';
import logSymbols from 'log-symbols';
import chalk, {ForegroundColor, BackgroundColor} from 'chalk';
import consola, {
  logType as LogType,
  ConsolaReporterLogObject,
  FancyReporter,
  FancyReporterOptions,
  Consola,
  ConsolaOptions,
  LogLevel,
} from 'consola';
import {DEFAULT_LOG_LEVEL, LogLevelMap} from './constants';
import _ from 'lodash';

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
let globalLevel = LogLevelMap[DEFAULT_LOG_LEVEL];

/**
 * The logger from which all loggers are created.  This one uses a unique tag and our custom reporter.
 */
const rootLogger = createLogProxy(
  consola.create({defaults: {tag: 'docutils'}, reporters: [new DocutilsReporter()]})
);

/**
 * @summary Creates a log-level-propagating proxy for a {@linkcode Consola} logger.
 * @description
 * Alright.  So when you create a new logger via {@linkcode Consola.create}, it's basically a clone
 * of its parent with a new set of options.
 *
 * If we change the log level of the root logger (which we do: see `cli/index.ts`), we may (almost
 * certainly) have
 * child loggers which: a) have already been created and b) have inherited the old/default log level
 * from the root logger. We don't _want_ that (though this is likely a reasonable use case) for our
 * purposes.
 *
 * The implementation below solves the problem by maintaining its own singleton log level value, and
 * intercepts the `level` property of any logger created from the root logger.
 *
 * There are other ways to go about this which may be better, but this seemed pretty straightforward.
 */
function createLogProxy(logger: Consola): Consola {
  return new Proxy(logger, {
    get(target, prop, receiver) {
      if (prop === 'level') {
        return globalLevel;
      }
      if (prop === 'create') {
        const create = Reflect.get(target, prop, receiver) as Consola['create'];
        return (opts: ConsolaOptions) => createLogProxy(create.call(receiver, opts));
      }
      if (prop === '_defaults') {
        const defaults = Reflect.get(target, prop, receiver);
        return {...defaults, level: globalLevel};
      }
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      if (prop === 'level') {
        globalLevel = value as LogLevel;
        return true;
      }
      return Reflect.set(target, prop, value, receiver);
    },
  });
}

/**
 * The proxied root logger
 * @see {createLogProxy}
 */
export default rootLogger;
