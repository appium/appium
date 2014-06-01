"use strict";

var winston = require('winston')
  , _ = require('underscore')
  , defaults = {colorize: true, timestamp: false};

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

module.exports.init = function (args) {
  var options = _.extend(_.clone(defaults), {
    timestamp: args.logTimestamp
  , handleExceptions: true
  , exitOnError: false
  , json: false
  , level: 'debug'
  });

  var winstonOptions = {
    console:
      _.extend({
        colorize: !args.logNoColors
      }, options)
    };

  winston.addColors(colors);
  winston.loggers.add('appium', winstonOptions);
  logger = winston.loggers.get('appium');
  logger.setLevels(levels);
  logger.stripColors = args.logNoColors;

  if (args.quiet) {
    logger.transports.console.level = 'warn';
  } else {
    //TODO: pass loglevel in server args
    logger.transports.console.level = process.env.APPIUM_LOGLEVEL || 'info';
  }

  if (args.log) {
    winstonOptions.file = _.extend({
      filename: args.log
    , colorize: false
    , maxFiles: 1
    }, options);

    try {
      logger.add(winston.transports.File, winstonOptions.file);
    } catch (e) {
      logger.info("Tried to attach logging to file " + args.log +
                  " but an error occurred");
    }
  }

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
      logger.add(winston.transports.Webhook, { 'host': host, 'port': port,
        'path': '/' });
    } catch (e) {
      logger.info("Tried to attach logging to webhook at " + host +
                  " but an error occurred");
    }
  }
};

module.exports.get = function () {
  if (logger === null) {
    exports.init({});
  }
  return logger;
};
