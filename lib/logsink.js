import npmlog from 'npmlog';
import { createLogger, format, transports } from 'winston';
import { fs, logger } from 'appium-support';
import dateformat from 'dateformat';
import _ from 'lodash';


// set up distributed logging before everything else
logger.patchLogger(npmlog);
global._global_npmlog = npmlog;

// npmlog is used only for emitting, we use winston for output
npmlog.level = 'silent';
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

let log = null;
let timeZone = null;

// add the timestamp in the correct format to the log info object
const timestampFormat = format.timestamp({
  format () {
    let date = new Date();
    if (!timeZone) {
      date = new Date(date.valueOf() + date.getTimezoneOffset() * 60000);
    }
    return dateformat(date, 'yyyy-mm-dd HH:MM:ss:l');
  },
});

// set the custom colors
const colorizeFormat = format.colorize({
  colors,
});

// Strip the color marking within messages
const stripColorFormat = format(function stripColor (info) {
  const code = /\u001b\[(\d+(;\d+)*)?m/g; // eslint-disable-line no-control-regex
  info.message = info.message.replace(code, '');
  return info;
})();

function createConsoleTransport (args, logLvl) {
  return new (transports.Console)({
    name: 'console',
    handleExceptions: true,
    exitOnError: false,
    json: false,
    level: logLvl,
    stderrLevels: ['error'],
    format: format.combine(
      format(function adjustDebug (info) {
        // prepend debug marker, and shift to `info` log level
        if (info.level === 'debug') {
          info.level = 'info';
          info.message = `[debug] ${info.message}`;
        }
        return info;
      })(),
      timestampFormat,
      args.logNoColors ? stripColorFormat : colorizeFormat,
      format.printf(function printInfo (info) {
        return `${args.logTimestamp ? `${info.timestamp} - ` : ''}${info.message}`;
      })
    ),
  });
}

function createFileTransport (args, logLvl) {
  return new (transports.File)({
    name: 'file',
    filename: args.logFile,
    maxFiles: 1,
    handleExceptions: true,
    exitOnError: false,
    json: false,
    level: logLvl,
    format: format.combine(
      stripColorFormat,
      timestampFormat,
      format.printf(function printInfo (info) {
        return `${info.timestamp} ${info.message}`;
      })
    )
  });
}

function createHttpTransport (args, logLvl) {
  let host = '127.0.0.1';
  let port = 9003;

  if (args.webhook.match(':')) {
    const hostAndPort = args.webhook.split(':');
    host = hostAndPort[0];
    port = parseInt(hostAndPort[1], 10);
  }

  return new (transports.Http)({
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
      format.printf(function printInfo (info) {
        return `${info.timestamp} ${info.message}`;
      })
    ),
  });
}

async function createTransports (args) {
  let transports = [];
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
      console.log(`Tried to attach logging to file '${args.logFile}' but an error ` +
                  `occurred: ${e.message}`);
    }
  }

  if (args.webhook) {
    try {
      transports.push(createHttpTransport(args, fileLogLevel));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`Tried to attach logging to Http at ${args.webhook} but ` +
                  `an error occurred: ${e.message}`);
    }
  }

  return transports;
}

async function init (args) {
  // set de facto param passed to timestamp function
  timeZone = args.localTimezone;

  // clean up in case we have initted before since npmlog is a global object
  clear();

  log = createLogger({
    transports: await createTransports(args),
    levels,
  });

  // Capture logs emitted via npmlog and pass them through winston
  npmlog.on('log', (logObj) => {
    const winstonLevel = npmToWinstonLevels[logObj.level] || 'info';
    let msg = logObj.message;
    if (logObj.prefix) {
      const prefix = `[${logObj.prefix}]`;
      msg = `${args.logNoColors ? prefix : prefix.magenta} ${msg}`;
    }
    log[winstonLevel](msg);
    if (args.logHandler && _.isFunction(args.logHandler)) {
      args.logHandler(logObj.level, msg);
    }

  });
}

function clear () {
  if (log) {
    for (let transport of _.keys(log.transports)) {
      log.remove(transport);
    }
  }
  npmlog.removeAllListeners('log');
}


export { init, clear };
export default init;
