"use strict";

// set up distributed logging before everything else
var npmlog = global._global_npmlog = require('npmlog');
// npmlog is used only for emitting, we use winston for output
npmlog.level = "silent";

var winston = require('winston')
  , fs = require('fs')
  , os = require('os')
  , path = require('path')
  , util = require('util')
  , tmp = require('tmp')
  , _ = require('underscore');
require('date-utils');

var tmpfile = tmp.fileSync();

var levels = {
  debug: 1
, info: 2
, warn: 3
, error: 4
};

var colors = {
  info: 'cyan'
, debug: 'grey'
, warn: 'yellow'
, error: 'red'
};

var npmToWinstonLevels = {
  silly: 'debug'
, verbose: 'debug'
, info: 'info'
, http: 'info'
, warn: 'warn'
, error: 'error'
};

var logger = null;
var timeZone = null;
var stackTrace = null;

// capture any logs emitted by other packages using our global distributed
// logger and pass them through winston
npmlog.on('log', function (logObj) {
  var winstonLevel = npmToWinstonLevels[logObj.level] || 'info';
  var msg = logObj.message && logObj.prefix ?
              (logObj.prefix + ": " + logObj.message) :
              (logObj.prefix || logObj.message);
  logger[winstonLevel](msg);
});

var timestamp = function () {
  var date = new Date();
  if (!timeZone) {
    date = new Date(date.valueOf() + date.getTimezoneOffset() * 60000);
  }
  return date.toFormat("YYYY-MM-DD HH24:MI:SS:LL");
};

// Strip the color marking within messages.
// We need to patch the transports, because the stripColor functionality in
// Winston is wrongly implemented at the logger level, and we want to avoid
// having to create 2 loggers.
function applyStripColorPatch(transport) {
  var _log = transport.log.bind(transport);
  transport.log = function (level, msg, meta, callback) {
    var code = /\u001b\[(\d+(;\d+)*)?m/g;
    msg = ('' + msg).replace(code, '');
    _log(level, msg, meta, callback);
  };
}

var _createConsoleTransport = function (args, logLvl) {
  var transport = new (winston.transports.Console)({
    name: "console"
    , timestamp: args.logTimestamp ? timestamp : undefined
    , colorize: !args.logNoColors
    , handleExceptions: true
    , exitOnError: false
    , json: false
    , level: logLvl
  });
  if (args.logNoColors) applyStripColorPatch(transport);
  return transport;
};

var _createFileTransport = function (args, logLvl) {
  return _createGenericFileTransport(args.log, "file", logLvl);
};

var _createTmpFileTransport = function (filename, logLvl) {
  return _createGenericFileTransport(filename, "tmp-server-file-log", logLvl);
};

var _createGenericFileTransport = function (filename, transportName, logLvl) {
  var transport = new (winston.transports.File) ({
        name: transportName
        , timestamp: timestamp
        , filename: filename
        , maxFiles: 1
        , handleExceptions: true
        , exitOnError: false
        , json: false
        , level: logLvl
      }
  );
  applyStripColorPatch(transport);
  return transport;
};

var _createWebhookTransport = function (args, logLvl) {
  var host = null,
      port = null;

  if (args.webhook.match(':')) {
    var hostAndPort = args.webhook.split(':');
    host = hostAndPort[0];
    port = parseInt(hostAndPort[1], 10);
  }

  var transport = new (winston.transports.Webhook)({
    name: "webhook"
    , host: host || '127.0.0.1'
    , port: port || 9003
    , path: '/'
    , handleExceptions: true
    , exitOnError: false
    , json: false
    , level: logLvl
  });
  applyStripColorPatch(transport);
  return transport;
};

var _createTransports = function (args) {
  var transports = [];
  var consoleLogLevel = null,
      fileLogLevel = null;

  if (args.loglevel && args.loglevel.match(":")) {
    // --log-level arg can optionally provide diff logging levels for console and file  separated by a colon
    var lvlPair = args.loglevel.split(':');
    consoleLogLevel =  lvlPair[0] || consoleLogLevel;
    fileLogLevel = lvlPair[1] || fileLogLevel;
  } else {
    consoleLogLevel = fileLogLevel = args.loglevel;
  }

  transports.push(_createConsoleTransport(args, consoleLogLevel));

  //create a tmp file to store the server log
  transports.push(_createTmpFileTransport(tmpfile.name, consoleLogLevel));

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

var _appDir = path.dirname(require.main.filename);

var _stackToString = function (stack) {
  var str = os.EOL + "    [------TRACE------]" + os.EOL;
  var len = stack.length < 15 ? stack.length : 15;

  for (var i = 0; i < len; i++) {
      var fileName = stack[i].getFileName();
      // ignore calls from this file
      if (fileName === __filename) continue;
      var substr = "    at ";
    try {
      var typeName = stack[i].getTypeName();

      substr += util.format("%s.%s (%s:%d:%d)" + os.EOL, typeName, stack[i].getFunctionName(),
                  path.relative(_appDir, stack[i].getFileName()), stack[i].getLineNumber(),
                  stack[i].getColumnNumber());
      str += substr;

    } catch (e) { }
  }

  return str;
};

var _addStackTrace = function (fn, stackTrace) {
  var _fn = fn;
  return function (msg) {
    _fn(msg + os.EOL + _stackToString(stackTrace.get()) + os.EOL);
  };
};

module.exports.init = function (args) {
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

  if (args.asyncTrace) {
    stackTrace = require('stack-trace');
    logger.info = _addStackTrace(logger.info, stackTrace);
    logger.warn = _addStackTrace(logger.warn, stackTrace);
    logger.error = _addStackTrace(logger.error, stackTrace);
  }
};

module.exports.get = function () {
  if (logger === null) {
    exports.init({});
  }
  return logger;
};

module.exports.getServerLog = function () {
  var logs = [];
  var data = fs.readFileSync(tmpfile.name, 'utf8');
  var content = data.split("\n");
  _.each(content, function (line) {
    line = line.trim()
    var logObj = {
      timestamp: Date.now()
      , level: 'ALL'
      , message: line
    };
    logs.push(logObj);
  });

  // after reading the tmp log, delete the tmp log file and create a new one so it won't get too large
  fs.closeSync(fs.openSync(tmpfile.name , 'w'));

  return logs;
};
