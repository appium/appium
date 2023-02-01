/**
 * It's a logger.
 *
 * Since this is a CLI app only, it doesn't necessarily make sense to consume `@appium/support`'s logger.
 *
 * @module
 */

import consola from 'consola';
import type {Consola, ConsolaOptions, LogLevel} from 'consola';
import {DEFAULT_LOG_LEVEL} from './constants';

/**
 * The logger from which all loggers are created
 *
 * `withTag`/`withScope` is a way to namespace logs. This is more useful if using log objects, but
 * you can also see the scope when using the CLI app (if your terminal window is 80+ cols).
 */
const rootLogger = consola.withTag('appium:docutils');

/**
 * The global log level
 *
 * "Global" inasmuch as any logger created from the root logger will use this level.
 */
let globalLevel = rootLogger.level ?? DEFAULT_LOG_LEVEL;

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
function createLogProxy(logger: Consola) {
  return new Proxy(logger, {
    get(target, prop, receiver) {
      if (prop === 'level') {
        return globalLevel ?? Reflect.get(target, prop, receiver);
      }
      if (prop === 'create') {
        const create = Reflect.get(target, prop, receiver) as Consola['create'];
        return (opts: ConsolaOptions) => createLogProxy(create.call(receiver, opts));
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
export default createLogProxy(rootLogger);
