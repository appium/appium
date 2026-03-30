import type {ParsedArgs} from 'appium/types';
import type {MessageObject} from '@appium/logger';
import type {Logger, Logform} from 'winston';
import type Transport from 'winston-transport';
import globalLog from '@appium/logger';
import {createLogger, format, transports} from 'winston';
import {fs} from '@appium/support';
import _ from 'lodash';
import {adler32} from './utils';
import {LRUCache} from 'lru-cache';

const LEVELS_MAP = {
  debug: 4,
  info: 3,
  warn: 2,
  error: 1,
} as const;
const COLORS_MAP = {
  info: 'cyan',
  debug: 'grey',
  warn: 'yellow',
  error: 'red',
} as const;
const TO_WINSTON_LEVELS_MAP = {
  silly: 'debug',
  verbose: 'debug',
  debug: 'debug',
  info: 'info',
  http: 'info',
  warn: 'warn',
  error: 'error',
} as const;
const COLOR_CODE_PATTERN = /\u001b\[(\d+(;\d+)*)?m/g; // eslint-disable-line no-control-regex

// https://www.ditig.com/publications/256-colors-cheat-sheet
const MIN_COLOR = 17;
const MAX_COLOR = 231;
const COLORS_CACHE = new LRUCache<string, number>({
  max: 1024,
  ttl: 1000 * 60 * 60 * 24, // expire after 24 hours
  updateAgeOnGet: true,
});

// npmlog is used only for emitting, we use winston for output (global is set by support)
let log: Logger | null = null;

/**
 * Initialize the log sink from parsed CLI/server args.
 * Sets up Winston transports (console, optional file, optional webhook) and forwards
 * npmlog messages to them. Call this before other logging setup.
 *
 * @param args - Parsed server/CLI arguments (e.g. `loglevel`, `logFile`, `webhook`).
 */
export async function init(args: ParsedArgs): Promise<void> {
  globalLog.level = 'silent';

  // clean up in case we have initiated before since npmlog is a global object
  clear();

  const transportList = await createTransports(args);
  const transportNames = new Set(transportList.map((tr) => tr.constructor.name));
  log = createLogger({
    transports: transportList,
    levels: LEVELS_MAP,
    handleExceptions: true,
    exitOnError: false,
  });

  const reportedLoggerErrors = new Set<string>();
  // Capture logs emitted via npmlog and pass them through winston
  globalLog.on('log', ({level, message, prefix}: MessageObject) => {
    const {sessionSignature} = globalLog.asyncStorage.getStore() ?? {};
    const prefixes: string[] = [];
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
        .map((pfx) => (isLogColorEnabled(args) ? colorizePrefix(pfx) : pfx))
        .join('');
      msg = `${finalPrefix} ${msg}`;
    }
    const winstonLevel = TO_WINSTON_LEVELS_MAP[level] || 'info';
    try {
      (log as Logger)[winstonLevel as keyof Logger](msg);
      if (_.isFunction(args.logHandler)) {
        args.logHandler(level, msg);
      }
    } catch (e) {
      const err = e as Error;
      if (!reportedLoggerErrors.has(err.message) && process.stderr.writable) {
        // eslint-disable-next-line no-console
        console.error(
          `The log message '${_.truncate(msg, {length: 30})}' cannot be written into ` +
            `one or more requested destinations: ${[...transportNames].join(', ')}. ` +
            `Original error: ${err.message}`
        );
        reportedLoggerErrors.add(err.message);
      }
    }
  });
  // Only Winston produces output; avoid duplicate lines from the logger's default stream
  globalLog.stream = null;
}

/**
 * Clear the log sink and remove global log listeners.
 * Safe to call before re-initializing with `init`.
 */
export function clear(): void {
  log?.clear();
  globalLog.removeAllListeners('log');
}

// #region private helpers

function createConsoleTransport(
  args: ParsedArgs,
  logLvl: string
): transports.ConsoleTransportInstance {
  const opt: transports.ConsoleTransportOptions = {
    level: logLvl,
    stderrLevels: ['error'],
    format: format.combine(
      formatTimestamp(args),
      isLogColorEnabled(args) ? colorizeFormat : stripColorFormat,
      formatLog(args, true),
    ),
  };
  return new transports.Console(opt);
}

function createFileTransport(
  args: ParsedArgs,
  logLvl: string
): transports.FileTransportInstance {
  const opt: transports.FileTransportOptions = {
    filename: args.logFile,
    maxFiles: 1,
    level: logLvl,
    format: format.combine(
      stripColorFormat,
      formatTimestamp(args),
      formatLog(args, false),
    ),
  };
  return new transports.File(opt);
}

function createHttpTransport(
  args: ParsedArgs,
  logLvl: string
): transports.HttpTransportInstance {
  let host = '127.0.0.1';
  let port = 9003;

  if (args.webhook?.match(':')) {
    const hostAndPort = args.webhook.split(':');
    host = hostAndPort[0];
    port = parseInt(hostAndPort[1], 10);
  }

  const opt: transports.HttpTransportOptions = {
    host,
    port,
    path: '/',
    level: logLvl,
    format: format.combine(stripColorFormat, formatLog(args, false)),
  };
  return new transports.Http(opt);
}

async function createTransports(args: ParsedArgs): Promise<Transport[]> {
  const transportList: Transport[] = [];
  let consoleLogLevel: string;
  let fileLogLevel: string;

  // Server args are normalized in main so we only see dest form (`loglevel`).
  // Fall back to schema default so Winston never sees undefined.
  const rawLogLevel = args.loglevel ?? 'debug';

  if (rawLogLevel && rawLogLevel.includes(':')) {
    // --log-level arg can optionally provide diff logging levels for console and file, separated by a colon
    const lvlPair = rawLogLevel.split(':');
    [consoleLogLevel, fileLogLevel] = lvlPair;
  } else {
    consoleLogLevel = fileLogLevel = rawLogLevel;
  }

  transportList.push(createConsoleTransport(args, consoleLogLevel));

  if (args.logFile) {
    try {
      // if we don't delete the log file, winston will always append and it will grow infinitely large;
      // winston allows for limiting log file size, but as of 9.2.14 there's a serious bug when using
      // maxFiles and maxSize together. https://github.com/flatiron/winston/issues/397
      if (await fs.exists(args.logFile)) {
        await fs.unlink(args.logFile);
      }

      transportList.push(createFileTransport(args, fileLogLevel));
    } catch (e) {
      const err = e as Error;
      // eslint-disable-next-line no-console
      console.log(
        `Tried to attach logging to file '${args.logFile}' but an error ` +
          `occurred: ${err.message}`
      );
    }
  }

  if (args.webhook) {
    try {
      transportList.push(createHttpTransport(args, fileLogLevel));
    } catch (e) {
      const err = e as Error;
      // eslint-disable-next-line no-console
      console.log(
        `Tried to attach logging to Http at ${args.webhook} but ` +
          `an error occurred: ${err.message}`
      );
    }
  }

  return transportList;
}

function toDecoratedPrefix(text: string): string {
  return `[${text}]`;
}

/**
 * Selects the color of the text in terminal from the MIN_COLOR..MAX_COLOR
 * range. We use adler32 hashing to ensure that equal prefixes would always have
 * same colors.
 */
function colorizePrefix(text: string): string {
  let colorIndex = COLORS_CACHE.get(text);
  if (!colorIndex) {
    const hash = adler32(text);
    colorIndex = MIN_COLOR + (hash % (MAX_COLOR - MIN_COLOR));
    COLORS_CACHE.set(text, colorIndex);
  }
  return `\x1b[38;5;${colorIndex}m${text}\x1b[0m`;
}

function formatLog(args: ParsedArgs, targetConsole: boolean): Logform.Format {
  if (['json', 'pretty_json'].includes(args.logFormat ?? '')) {
    return format.combine(
      format((info) => {
        const infoCopy = {...info};
        const contextInfo = globalLog.asyncStorage.getStore() ?? {};

        if (targetConsole && !args.logTimestamp) {
          delete infoCopy.timestamp;
        }

        if (!_.isEmpty(contextInfo)) {
          infoCopy.context = {...contextInfo};
        }

        return infoCopy;
      })(),
      format.json({space: args.logFormat === 'pretty_json' ? 2 : undefined}),
    );
  }

  return format.printf((info: {timestamp?: string; message?: unknown}) => {
    if (targetConsole) {
      return `${args.logTimestamp ? `${info.timestamp} - ` : ''}${info.message}`;
    }
    return `${info.timestamp} ${info.message}`;
  });
}

/** Add the timestamp in the correct format to the log info object. */
function formatTimestamp(args: ParsedArgs): Logform.Format {
  return format.timestamp({
    format() {
      let date = new Date();
      if (args.localTimezone) {
        date = new Date(date.valueOf() - date.getTimezoneOffset() * 60000);
      }
      // '2012-11-04T14:51:06.157Z' -> '2012-11-04 14:51:06:157'
      return date.toISOString().replace(/[TZ]/g, ' ').replace(/\./g, ':').trim();
    },
  });
}

// set the custom colors
const colorizeFormat = format.colorize({
  colors: COLORS_MAP,
});

/**
 * Strips ANSI color control codes from a string.
 *
 * @param text - String that may contain escape codes (e.g. `\u001b[31m`).
 * @returns The string with all color codes removed.
 */
export function stripColorCodes(text: string): string {
  return text.replace(COLOR_CODE_PATTERN, '');
}

// Strip the color marking within messages (depends on stripColorCodes)
const stripColorFormat = format(function stripColor(info: {level: string; message: unknown; [key: string]: unknown}) {
  return {
    ...info,
    level: stripColorCodes(info.level),
    message: _.isString(info.message) ? stripColorCodes(info.message) : info.message,
  };
})();

function isLogColorEnabled(args: ParsedArgs): boolean {
  return !args.logNoColors && args.logFormat === 'text';
}
// #endregion
