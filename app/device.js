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
  logger.info('Pushing command to appium work queue: ' + JSON.stringify(command));
  this.push([command, cb]);
  if (typeof command === "object") {
    command = JSON.stringify(command);
  }
};

exports.waitForCondition = function(waitMs, condFn, cb, intervalMs) {
  if (typeof intervalMs === "undefined") {
    intervalMs = 500;
  }
  var begunAt = Date.now();
  var endAt = begunAt + waitMs;
  var me = this;
  var spin = function() {
    condFn(function(condMet) {
      var args = Array.prototype.slice.call(arguments);
      if (condMet) {
        cb.apply(me, args.slice(1));
      } else if (Date.now() < endAt) {
        setTimeout(spin, intervalMs);
      } else {
        cb.apply(me, args.slice(1));
      }
    });
  };
  spin();
};
