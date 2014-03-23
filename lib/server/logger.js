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
  var options = _.extend(defaults, {
    colorize: !args.logNoColors
  , timestamp: args.logTimestamp
  });

  var winstonOptions = {
    console:
      _.extend({
        handleExceptions: true
      , json: false
      , level: 'debug'
      , exitOnError: false
      }, options)
    };

  if (args.log) {
    winstonOptions.file = {
      filename: args.log
    , colorize: false
    , level: 'debug'
    , maxsize: 10000000
    , maxFiles: 1
    , json: false
    };
  }

  winston.addColors(colors);
  winston.loggers.add('appium', winstonOptions);
  logger = winston.loggers.get('appium');
  logger.setLevels(levels);


  if (args.quiet) {
    logger.transports.console.level = 'warn';
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
