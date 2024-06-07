import globalLog from '@appium/logger';
import {createLogger, format, transports} from 'winston';
import {fs} from '@appium/support';
import _ from 'lodash';
import { adler32 } from './utils';
import { LRUCache } from 'lru-cache';

// set up distributed logging before everything else
global._global_npmlog = globalLog;

// npmlog is used only for emitting, we use winston for output
globalLog.level = 'info';
const levels = {
  debug: 4,
  info: 3,
  warn: 2,
  error: 1,
};
const colors = {
  info: 'cyan',
  debug: 'grey',
  warn: 'yellow',
  error: 'red',
};
const npmToWinstonLevels = {
  silly: 'debug',
  verbose: 'debug',
  debug: 'debug',
  info: 'info',
  http: 'info',
  warn: 'warn',
  error: 'error',
};
const COLOR_CODE_PATTERN = /\u001b\[(\d+(;\d+)*)?m/g; // eslint-disable-line no-control-regex

// https://www.ditig.com/publications/256-colors-cheat-sheet
const MIN_COLOR = 17;
const MAX_COLOR = 231;
/** @type {LRUCache<string, number>} */
const COLORS_CACHE = new LRUCache({
  max: 1024,
  ttl: 1000 * 60 * 60 * 24, // expire after 24 hours
  updateAgeOnGet: true,
});

let log = null;

// set the custom colors
const colorizeFormat = format.colorize({
  colors,
});

// Strip the color marking within messages
const stripColorFormat = format(function stripColor(info) {
  return {
    ...info,
    level: stripColorCodes(info.level),
    message: stripColorCodes(info.message),
  };
})();

/**
 *
 * @param {import('@appium/types').StringRecord} args
 * @param {string} logLvl
 * @returns {transports.ConsoleTransportInstance}
 */
function createConsoleTransport(args, logLvl) {
  return new transports.Console({
    // @ts-expect-error The 'name' property should exist
    name: 'console',
    handleExceptions: true,
    exitOnError: false,
    json: false,
    level: logLvl,
    stderrLevels: ['error'],
    format: format.combine(
      formatTimestamp(args),
      isLogColorEnabled(args) ? colorizeFormat : stripColorFormat,
      format.printf(formatLogLine(args, true))
    ),
  });
}

/**
 *
 * @param {import('@appium/types').StringRecord} args
 * @param {string} logLvl
 * @returns {transports.FileTransportInstance}
 */
function createFileTransport(args, logLvl) {
  return new transports.File({
    // @ts-expect-error The 'name' property should exist
    name: 'file',
    filename: args.logFile,
    maxFiles: 1,
    handleExceptions: true,
    exitOnError: false,
    json: false,
    level: logLvl,
    format: format.combine(
      stripColorFormat,
      formatTimestamp(args),
      format.printf(formatLogLine(args, false))
    ),
  });
}

/**
 *
 * @param {import('@appium/types').StringRecord} args
 * @param {string} logLvl
 * @returns {transports.HttpTransportInstance}
 */
function createHttpTransport(args, logLvl) {
  let host = '127.0.0.1';
  let port = 9003;

  if (args.webhook.match(':')) {
    const hostAndPort = args.webhook.split(':');
    host = hostAndPort[0];
    port = parseInt(hostAndPort[1], 10);
  }

  return new transports.Http({
    // @ts-expect-error The 'name' property should exist
    name: 'http',
    host,
    port,
    path: '/',
    handleExceptions: true,
    exitOnError: false,
    json: false,
    level: logLvl,
    format: format.combine(
      stripColorFormat,
      format.printf(formatLogLine(args, false))
    ),
  });
}

/**
 *
 * @param {import('@appium/types').StringRecord} args
 * @returns {Promise<import('winston-transport')[]>}
 */
async function createTransports(args) {
  const transports = [];
  let consoleLogLevel = null;
  let fileLogLevel = null;

  if (args.loglevel && args.loglevel.match(':')) {
    // --log-level arg can optionally provide diff logging levels for console and file, separated by a colon
    const lvlPair = args.loglevel.split(':');
    consoleLogLevel = lvlPair[0] || consoleLogLevel;
    fileLogLevel = lvlPair[1] || fileLogLevel;
  } else {
    consoleLogLevel = fileLogLevel = args.loglevel;
  }

  transports.push(createConsoleTransport(args, consoleLogLevel));

  if (args.logFile) {
    try {
      // if we don't delete the log file, winston will always append and it will grow infinitely large;
      // winston allows for limiting log file size, but as of 9.2.14 there's a serious bug when using
      // maxFiles and maxSize together. https://github.com/flatiron/winston/issues/397
      if (await fs.exists(args.logFile)) {
        await fs.unlink(args.logFile);
      }

      transports.push(createFileTransport(args, fileLogLevel));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(
        `Tried to attach logging to file '${args.logFile}' but an error ` + `occurred: ${e.message}`
      );
    }
  }

  if (args.webhook) {
    try {
      transports.push(createHttpTransport(args, fileLogLevel));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(
        `Tried to attach logging to Http at ${args.webhook} but ` +
          `an error occurred: ${e.message}`
      );
    }
  }

  return transports;
}

/**
 *
 * @param {string} text
 * @returns {string}
 */
function toDecoratedPrefix(text) {
  return `[${text}]`;
}

/**
 * Selects the color of the text in terminal from the MIN_COLOR..MAX_COLOR
 * range. We use adler32 hashing to ensure that equal prefixes would always have
 * same colors.
 *
 * @param {string} text Initial text
 * @returns {string} Colorized text (with pseudocode cchars added)
 */
function colorizePrefix(text) {
  let colorIndex = COLORS_CACHE.get(text);
  if (!colorIndex) {
    const hash = adler32(text);
    colorIndex = MIN_COLOR + hash % (MAX_COLOR - MIN_COLOR);
    COLORS_CACHE.set(text, colorIndex);
  }
  return `\x1b[38;5;${colorIndex}m${text}\x1b[0m`;
}

async function init(args) {
  globalLog.level = 'silent';

  // clean up in case we have initiated before since npmlog is a global object
  clear();

  const transports = await createTransports(args);
  const transportNames = new Set(transports.map((tr) => tr.constructor.name));
  log = createLogger({
    transports,
    levels,
  });

  const reportedLoggerErrors = new Set();
  // Capture logs emitted via npmlog and pass them through winston
  globalLog.on('log', ({level, message, prefix}) => {
    const {sessionSignature} = globalLog.asyncStorage.getStore() ?? {};
    /** @type {string[]} */
    const prefixes = [];
    if (sessionSignature) {
      prefixes.push(sessionSignature);
    }
    if (prefix) {
      prefixes.push(prefix);
    }
    let msg = message;
    if (!_.isEmpty(prefixes)) {
      const finalPrefix = prefixes
        .map(toDecoratedPrefix)
        .map((pfx) => isLogColorEnabled(args) ? colorizePrefix(pfx) : pfx)
        .join('');
      msg = `${finalPrefix} ${msg}`;
    }
    const winstonLevel = npmToWinstonLevels[level] || 'info';
    try {
      log[winstonLevel](msg);
      if (_.isFunction(args.logHandler)) {
        args.logHandler(level, msg);
      }
    } catch (e) {
      if (!reportedLoggerErrors.has(e.message) && process.stderr.writable) {
        // eslint-disable-next-line no-console
        console.error(
          `The log message '${_.truncate(msg, {length: 30})}' cannot be written into ` +
          `one or more requested destinations: ${transportNames}. Original error: ${e.message}`
        );
        reportedLoggerErrors.add(e.message);
      }
    }
  });
}

function clear() {
  if (log) {
    for (let transport of _.keys(log.transports)) {
      log.remove(transport);
    }
  }
  globalLog.removeAllListeners('log');
}

/**
 * @param {import('@appium/types').StringRecord} args
 * @param {boolean} targetConsole
 * @returns {(info: import('logform').TransformableInfo) => string}
 */
function formatLogLine(args, targetConsole) {
  return (info) => {
    if (['json', 'pretty_json'].includes(args.logFormat)) {
      let infoCopy = {...info};
      if (targetConsole && !args.logTimestamp) {
        delete infoCopy.timestamp;
      }
      return JSON.stringify(infoCopy, null, args.logFormat === 'pretty_json' ? 2 : undefined);
    }
    if (targetConsole) {
      return `${args.logTimestamp ? `${info.timestamp} - ` : ''}${info.message}`;
    }
    return `${info.timestamp} ${info.message}`;
  };
}

/**
 * add the timestamp in the correct format to the log info object
 *
 * @param {import('@appium/types').StringRecord} args
 * @returns {import('logform').Format}
 */
function formatTimestamp(args) {
  return format.timestamp({
    format() {
      let date = new Date();
      if (args.useLocalTimeZone) {
        date = new Date(date.valueOf() - date.getTimezoneOffset() * 60000);
      }
      // '2012-11-04T14:51:06.157Z' -> '2012-11-04 14:51:06:157'
      return date.toISOString().replace(/[TZ]/g, ' ').replace(/\./g, ':').trim();
    },
  });
}

/**
 * Strips color control codes from the given string
 *
 * @param {string} text
 * @returns {string}
 */
function stripColorCodes(text) {
  return text.replace(COLOR_CODE_PATTERN, '');
}

/**
 *
 * @param {import('@appium/types').StringRecord} args
 * @returns {boolean}
 */
function isLogColorEnabled(args) {
  return !args.logNoColors && args.logFormat === 'text';
}

export {init, clear};
export default init;
