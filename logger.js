"use strict";

var winston = require('winston')
  , options = {
      transports: [
        new winston.transports.Console({
          handleExceptions: true
          , json: false
          , level: 'debug'
          , exitOnError: false
        })
      ]
    };

winston.loggers.add('appium', options);
var levels = {
  debug: 1
  , info: 2
  , warn: 3
  , error: 4
};
winston.loggers.get('appium').setLevels(levels);
winston.addColors({
  info: 'cyan'
  , debug: 'grey'
  , warn: 'yellow'
  , error: 'error'
});

module.exports.get = function(name) {
  return winston.loggers.get(name);
};

module.exports.setWebhook = function(logger, port, host) {
  var _host = '127.0.0.1' || host;
  var _port = port || 9003;
  try {
    logger.add(winston.transports.Webhook, { 'host': _host, 'port': _port, 'path': '/' });
  } catch (e) {
    logger.info("Tried to attach logging to webhook at " + _host + " but an error occurred");
  }
};

module.exports.setLogFile = function(logger, filename) {
  try {
    logger.add(winston.transports.File, {
      filename: filename
      , colorize: false
      , level: 'debug'
      , maxsize: 10000000
      , maxFiles: 1
      , json: false
    });
  } catch (e) {
    logger.info("Tried to attach logging to file " + filename + " but an error occurred; maybe we're already logging to this file?");
  }
};
