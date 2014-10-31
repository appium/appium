"use strict";

var winston = require('winston'),
  fs = require('fs');
require('date-utils');


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

var logger = null;
var timeZone = null;
var consoleLogLevel = null;
var fileLogLevel = null;

var timestamp = function () {
  var date = new Date();
  if (!timeZone) {
    date = new Date(date.valueOf() + date.getTimezoneOffset() * 60000);
  }
  return date.toFormat("YYYY-MM-DD HH24:MI:SS:LL");
};

var _createConsoleTransport = function (args, logLvl) {
  return new (winston.transports.Console)({
    name: "console"
    , timestamp: args.logTimestamp ? timestamp : undefined
    , colorize: !args.logNoColors
    , handleExceptions: true
    , exitOnError: false
    , json: false
    , level: logLvl
  });
};

var _createWebhookTransport = function (args, logLvl) {
  var host = null,
      port = null;

  if (args.webhook.match(':')) {
    var hostAndPort = args.webhook.split(':');
    host = hostAndPort[0];
    port = parseInt(hostAndPort[1], 10);
  }

  return new (winston.transports.Webhook)({
    name: "webhook"
    , host: host || '127.0.0.1'
    , port: port || 9003
    , path: '/'
    , handleExceptions: true
    , exitOnError: false
    , json: false
    , level: logLvl
  });
};

var _createTransports = function (args) {
  var transports = [];
  transports.push(_createConsoleTransport(args, consoleLogLevel));

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

var _createFileTransport = function (args) {
  var transports = [];
  var fileLogLevel = null;

  try {
    // if we don't delete the log file, winston will always append and it will grow infinitely large;
    // winston allows for limiting log file size, but as of 9.2.14 there's a serious bug when using
    // maxFiles and maxSize together. https://github.com/flatiron/winston/issues/397
    if (fs.existsSync(args.log)) {
      fs.unlinkSync(args.log);
    }

    var fileTransport = new (winston.transports.File)({
      name: "file"
      , timestamp: timestamp
      , filename: args.log
      , maxFiles: 1
      , handleExceptions: true
      , exitOnError: false
      , json: false
      , level: fileLogLevel
    });
    transports.push(fileTransport);
  } catch (e) {
    console.log("Tried to attach logging to file " + args.log +
                " but an error occurred: " + e.msg);
  }

  return transports;
};


module.exports.init = function (args) {
  // set de facto param passed to timestamp function
  timeZone = args.localTimezone;

  // by not adding colors here and not setting 'colorize' in transports
  // when logNoColors === true, console output is fully stripped of color.
  if (!args.logNoColors) {
    winston.addColors(colors);
  }

  if (args.loglevel && args.loglevel.match(":")) {
    // --log-level arg can optionally provide diff logging levels for console and file separated by a colon
    var lvlPair = args.loglevel.split(':');
    consoleLogLevel =  lvlPair[0] || consoleLogLevel;
    fileLogLevel = lvlPair[1] || fileLogLevel;
  } else {
    consoleLogLevel = fileLogLevel = args.loglevel;
  }

  logger = new (winston.Logger)({
    transports: _createTransports(args)
  });

  logger.setLevels(levels);
  logger.stripColors = args.logNoColors;

  // 8/19/14 this is a hack to force Winston to print debug messages to stdout rather than stderr.
  // TODO: remove this if winston provides an API for directing streams.
  if (levels[logger.transports.console.level] === levels.debug) {
    logger.debug = function (msg) { logger.info('[debug] ' + msg); };
  }

  if (args.log) {
    var fileLogger = new (winston.Logger)({
      transports: _createFileTransport(args)
    });
    fileLogger.setLevels(levels);
    fileLogger.stripColors = true;

    var decorateWithCallback = function (func, callback) {
      return function () {
        var args = Array.prototype.slice.call(arguments);
        func.apply(this, args);
        callback.apply(this, args);
      };
    };

    logger.info = decorateWithCallback(logger.info, fileLogger.info);
    logger.debug = decorateWithCallback(logger.debug, fileLogger.debug);
    logger.warn = decorateWithCallback(logger.warn, fileLogger.warn);
    logger.error = decorateWithCallback(logger.error, fileLogger.error);
  }
};

module.exports.get = function () {
  if (logger === null) {
    exports.init({});
  }
  return logger;
};
