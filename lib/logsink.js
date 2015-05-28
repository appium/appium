import npmlog from 'npmlog';
import { patchLogger } from 'appium-logger';
import winston  from 'winston';
import fs from 'fs';
import 'date-utils'; // TODO: make --localtimezone work without it

// set up distributed logging before everything else
patchLogger(npmlog);
global._global_npmlog = npmlog;

// npmlog is used only for emitting, we use winston for output
npmlog.level = "silent";
let levels = {
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

let colors = {
  info: 'cyan',
  debug: 'grey',
  warn: 'yellow',
  error: 'red',
};

let npmToWinstonLevels = {
  silly: 'debug',
  verbose: 'debug',
  debug: 'debug',
  info: 'info',
  http: 'info',
  warn: 'warn',
  error: 'error',
};

let logger = null;
let timeZone = null;

// Capture logs emitted via npmlog and pass them through winston
npmlog.on('log', (logObj) => {
  let winstonLevel = npmToWinstonLevels[logObj.level] || 'info';
  let msg = [];
  if (logObj.prefix) msg.push(('[' + logObj.prefix + ']').magenta);
  msg.push(logObj.message);
  logger[winstonLevel](msg.join(' '));
});

let timestamp = () => {
  let date = new Date();
  if (!timeZone) {
    date = new Date(date.valueOf() + date.getTimezoneOffset() * 60000);
  }
  return date.toFormat("YYYY-MM-DD HH24:MI:SS:LL");
};

// Strip the color marking within messages.
// We need to patch the transports, because the stripColor functionality in
// Winston is wrongly implemented at the logger level, and we want to avoid
// having to create 2 loggers.
function applyStripColorPatch (transport) {
  let _log = transport.log.bind(transport);
  transport.log = function (level, msg, meta, callback) {
    let code = /\u001b\[(\d+(;\d+)*)?m/g;
    msg = ('' + msg).replace(code, '');
    _log(level, msg, meta, callback);
  };
}

let _createConsoleTransport = function (args, logLvl) {
  let transport = new (winston.transports.Console)({
    name: "console",
    timestamp: args.logTimestamp ? timestamp : undefined,
    colorize: !args.logNoColors,
    handleExceptions: true,
    exitOnError: false,
    json: false,
    level: logLvl,
  });
  if (args.logNoColors) applyStripColorPatch(transport);
  return transport;
};

let _createFileTransport = (args, logLvl) => {
  let transport = new (winston.transports.File)({
      name: "file",
      timestamp: timestamp,
      filename: args.log,
      maxFiles: 1,
      handleExceptions: true,
      exitOnError: false,
      json: false,
      level: logLvl,
    }
  );
  applyStripColorPatch(transport);
  return transport;
};

let _createWebhookTransport = function (args, logLvl) {
  let host = null,
      port = null;

  if (args.webhook.match(':')) {
    let hostAndPort = args.webhook.split(':');
    host = hostAndPort[0];
    port = parseInt(hostAndPort[1], 10);
  }

  let transport = new (winston.transports.Webhook)({
    name: "webhook",
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
};

let _createTransports = function (args) {
  let transports = [];
  let consoleLogLevel = null,
      fileLogLevel = null;

  if (args.loglevel && args.loglevel.match(":")) {
    // --log-level arg can optionally provide diff logging levels for console and file  separated by a colon
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
      if (fs.existsSync(args.log)) {
        fs.unlinkSync(args.log);
      }

      transports.push(_createFileTransport(args, fileLogLevel));
    } catch (e) {
      console.log("Tried to attach logging to file " + args.log +
                  " but an error occurred: " + e.msg);
    }
  }

  if (args.webhook) {
    try {
      transports.push(_createWebhookTransport(args, fileLogLevel));
    } catch (e) {
      console.log("Tried to attach logging to webhook at " + args.webhook +
                  " but an error occurred. " + e.msg);
    }
  }

  return transports;
};

export function init (args) {
  // set de facto param passed to timestamp function
  timeZone = args.localTimezone;

  // by not adding colors here and not setting 'colorize' in transports
  // when logNoColors === true, console output is fully stripped of color.
  if (!args.logNoColors) {
    winston.addColors(colors);
  }

  logger = new (winston.Logger)({
    transports: _createTransports(args)
  });

  logger.setLevels(levels);

  // 8/19/14 this is a hack to force Winston to print debug messages to stdout rather than stderr.
  // TODO: remove this if winston provides an API for directing streams.
  if (levels[logger.transports.console.level] === levels.debug) {
    logger.debug = function (msg) { logger.info('[debug] ' + msg); };
  }
}
