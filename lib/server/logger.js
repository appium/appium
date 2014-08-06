"use strict";

var winston = require('winston');
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
var serverArgs = null;

var timestamp = function () {
  var date = new Date();
  if (!serverArgs.localTimezone) {
    date = new Date(date.valueOf() + date.getTimezoneOffset() * 60000);
  }
  return date.toFormat("YYYY-MM-DD HH24:MI:SS:LL");
};

module.exports.init = function (args) {
  serverArgs = args;
  var loglevel = args.logLevel ? args.logLevel :
     (args.quiet ? 'warn' : 'debug');

  winston.addColors(colors);
  winston.loggers.add('appium', {
    console: {
        timestamp: args.logTimestamp ? timestamp : false
      , colorize: args.logNoColors ? false : true
      , handleExceptions: true
      , exitOnError: false
      , json: false
      , level: loglevel
    }
  });
  logger = winston.loggers.get('appium');
  logger.setLevels(levels);
  logger.stripColors = args.logNoColors;
  logger.appiumLoglevel = loglevel;

  var fileLogger = null;
  if (args.log) {
    try {
      winston.loggers.add('appium-file', {
        file: {
            timestamp: timestamp
          , colorize: false
          , filename: args.log
          , maxFiles: 1
          , level: loglevel
          , handleExceptions: true
          , exitOnError: false
          , json: false
          }
        }
      );
      fileLogger = winston.loggers.get('appium-file');
      fileLogger.setLevels(levels);
      fileLogger.stripColors = true;
    } catch (e) {
      logger.debug("Tried to attach logging to file " + args.log +
                  " but an error occurred");
    }
  }

  var webhookLogger = null;
  if (args.webhook) {
    var host = args.webhook;
    var port = 9003;
    if (host.indexOf(':') > -1) {
      try {
        host = host.substring(0, host.indexOf(':'));
        port = args.webhook.substring(args.webhook.indexOf(':') + 1);
        port = parseInt(port, 10);
      } catch (e) {
      }
    }
    host = host || '127.0.0.1';
    port = port || 9003;
    try {
      winston.loggers.add('appium-webhook', { webhook: {
          host: host
        , port: port
        , path: '/'
        , level: loglevel
        , handleExceptions: true
        , exitOnError: false
        , json: false
        }
      });
      webhookLogger = winston.loggers.get('appium-webhook');
      webhookLogger.setLevels(levels);
      webhookLogger.stripColors = true;
    } catch (e) {
      logger.debug("Tried to attach logging to webhook at " + host +
                  " but an error occurred");
    }
  }

  logger.on('logging', function (transport, level, msg, meta) {
    if (fileLogger) fileLogger.log(level, msg, meta);
    if (webhookLogger) webhookLogger.log(level, msg, meta);
  });
};


module.exports.get = function () {
  if (logger === null) {
    exports.init({});
  }
  return logger;
};
