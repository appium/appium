import npmlog from 'npmlog';
import winston  from 'winston';
import { fs, logger } from 'appium-support';
import dateformat from 'dateformat';
import _ from 'lodash';

// set up distributed logging before everything else
logger.patchLogger(npmlog);
global._global_npmlog = npmlog;

// npmlog is used only for emitting, we use winston for output
npmlog.level = "silent";
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

function timestamp () {
  let date = new Date();
  if (!timeZone) {
    date = new Date(date.valueOf() + date.getTimezoneOffset() * 60000);
  }
  return dateformat(date, "yyyy-mm-dd HH:MM:ss:l");
}

// Strip the color marking within messages.
// We need to patch the transports, because the stripColor functionality in
// Winston is wrongly implemented at the logger level, and we want to avoid
// having to create 2 loggers.
function applyStripColorPatch (transport) {
  let _log = transport.log.bind(transport);
  transport.log = function (level, msg, meta, callback) { // eslint-disable-line promise/prefer-await-to-callbacks
    let code = /\u001b\[(\d+(;\d+)*)?m/g;
    msg = ('' + msg).replace(code, '');
    _log(level, msg, meta, callback);
  };
}

function _createConsoleTransport (args, logLvl) {
  let transport = new (winston.transports.Console)({
    name: "console",
    timestamp: args.logTimestamp ? timestamp : undefined,
    colorize: !args.logNoColors,
    handleExceptions: true,
    exitOnError: false,
    json: false,
    level: logLvl,
    formatter (options) {
      let meta = options.meta && Object.keys(options.meta).length ? `\n\t${JSON.stringify(options.meta)}` : '';
      let timestampPrefix = '';
      if (options.timestamp) {
        timestampPrefix = `${options.timestamp()} - `;
      }
      return `${timestampPrefix}${options.message || ''}${meta}`;
    }
  });
  if (args.logNoColors) {
    applyStripColorPatch(transport);
  }

  return transport;
}

function _createFileTransport (args, logLvl) {
  let transport = new (winston.transports.File)({
    name: "file",
    timestamp,
    filename: args.log,
    maxFiles: 1,
    handleExceptions: true,
    exitOnError: false,
    json: false,
    level: logLvl,
  });
  applyStripColorPatch(transport);
  return transport;
}

function _createHttpTransport (args, logLvl) {
  let host = null,
      port = null;

  if (args.webhook.match(':')) {
    let hostAndPort = args.webhook.split(':');
    host = hostAndPort[0];
    port = parseInt(hostAndPort[1], 10);
  }

  let transport = new (winston.transports.Http)({
    name: "http",
    host: host || '127.0.0.1',
    port: port || 9003,
    path: '/',
    handleExceptions: true,
    exitOnError: false,
    json: false,
    level: logLvl,
  });
  applyStripColorPatch(transport);
  return transport;
}

async function _createTransports (args) {
  let transports = [];
  let consoleLogLevel = null;
  let fileLogLevel = null;

  if (args.loglevel && args.loglevel.match(":")) {
    // --log-level arg can optionally provide diff logging levels for console and file, separated by a colon
    let lvlPair = args.loglevel.split(':');
    consoleLogLevel =  lvlPair[0] || consoleLogLevel;
    fileLogLevel = lvlPair[1] || fileLogLevel;
  } else {
    consoleLogLevel = fileLogLevel = args.loglevel;
  }

  transports.push(_createConsoleTransport(args, consoleLogLevel));

  if (args.log) {
    try {
      // if we don't delete the log file, winston will always append and it will grow infinitely large;
      // winston allows for limiting log file size, but as of 9.2.14 there's a serious bug when using
      // maxFiles and maxSize together. https://github.com/flatiron/winston/issues/397
      if (await fs.exists(args.log)) {
        await fs.unlink(args.log);
      }

      transports.push(_createFileTransport(args, fileLogLevel));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`Tried to attach logging to file ${args.log} but an error ` +
                  `occurred: ${e.message}`);
    }
  }

  if (args.webhook) {
    try {
      transports.push(_createHttpTransport(args, fileLogLevel));
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

  // by not adding colors here and not setting 'colorize' in transports
  // when logNoColors === true, console output is fully stripped of color.
  if (!args.logNoColors) {
    winston.addColors(colors);
  }

  // clean up in case we have initted before since npmlog is a global
  // object
  clear();

  log = new (winston.Logger)({
    transports: await _createTransports(args)
  });

  // Capture logs emitted via npmlog and pass them through winston
  npmlog.on('log', (logObj) => {
    let winstonLevel = npmToWinstonLevels[logObj.level] || 'info';
    let msg = logObj.message;
    if (logObj.prefix) {
      let prefix = `[${logObj.prefix}]`;
      msg = `${prefix.magenta} ${msg}`;
    }
    log[winstonLevel](msg);
    if (args.logHandler && typeof args.logHandler === "function") {
      args.logHandler(logObj.level, msg);
    }

  });


  log.setLevels(levels);

  // 8/19/14 this is a hack to force Winston to print debug messages to stdout rather than stderr.
  // TODO: remove this if winston provides an API for directing streams.
  if (levels[log.transports.console.level] === levels.debug) {
    log.debug = function (msg) {
      log.info('[debug] ' + msg);
    };
  }
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
