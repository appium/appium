"use strict";

var winston = require('winston')
  , options = {
      transports: [
        new winston.transports.Console({
          handleExceptions: true
          , json: false
          , level: 'rest'
          , exitOnError: false
        })
      ]
    };

winston.loggers.add('appium', options);
winston.loggers.add('instruments', options);
winston.loggers.get('appium').setLevels({
  rest: 0
  , debug: 1
  , info: 2
  , warn: 3
  , error: 4
});
winston.addColors({
  info: 'cyan'
  , rest: 'grey'
  , debug: 'grey'
  , warn: 'yellow'
  , error: 'error'
});

module.exports.get = function(name) {
  return winston.loggers.get(name);
};

module.exports.setLogFile = function(logger, filename) {
  logger.add(winston.transports.File, {
    filename: filename
    , colorize: false
    , level: 'rest'
    , maxsize: 1000000
    , maxFiles: 4
    , json: false
  });
};
