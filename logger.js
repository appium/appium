"use strict";

var winston = require('winston')
  , options = {
      transports: [
        new winston.transports.Console({
          handleExceptions: true
          , json: false
          , exitOnError: false
        })
      ]
    };

winston.loggers.add('appium', options);
winston.loggers.add('instruments', options);
winston.addColors({
  info: 'cyan'
  , warn: 'yellow'
  , error: 'error'
});

module.exports.get = function(name) {
  return winston.loggers.get(name);
};
