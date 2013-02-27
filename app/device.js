"use strict";

var errors = require('./errors')
  , logger = require('../logger').get('appium');

var UnknownError = errors.UnknownError
  , ProtocolError = errors.ProtocolError;


exports.respond = function(response, cb) {
  if (typeof response === 'undefined') {
    cb(null, '');
  } else {
    if (typeof(response) !== "object") {
      cb(new UnknownError(), response);
    } else if (!('status' in response)) {
      cb(new ProtocolError('Status missing in response from device'), response);
    } else {
      var status = parseInt(response.status, 10);
      if (isNaN(status)) {
        cb(new ProtocolError('Invalid status in response from device'), response);
      } else {
        response.status = status;
        cb(null, response);
      }
    }
  }
};

exports.proxy = function(command, cb) {
  // was thinking we should use a queue for commands instead of writing to a file
  this.push([command, cb]);
  logger.info('Pushed command to appium work queue: ' + command);
};
