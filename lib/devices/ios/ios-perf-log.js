"use strict";

var logger = require('../../server/logger.js').get('appium');

// Date-Utils: Polyfills for the Date object
require('date-utils');

var MAX_EVENTS = 5000;

var IosPerfLog = function (remote) {
  this.remote = remote;
  this.timelineEvents = [];
  this.flushed = true;
};

IosPerfLog.prototype.startCapture = function (cb) {
  logger.debug('Starting to capture timeline logs');
  this.timelineEvents = [];
  return this.remote.startTimeline(this.onTimelineEvent.bind(this), cb);
};

IosPerfLog.prototype.stopCapture = function (cb) {
  this.timelineEvents = null;
  return this.remote.stopTimeline(cb);
};

IosPerfLog.prototype.onTimelineEvent = function (event) {
  if (this.flushed) {
    logger.debug('Flushing Timeline events');
    this.timelineEvents = [];
    this.flushed = false;
  }
  this.timelineEvents.push(event);
  if (this.timelineEvents.length > MAX_EVENTS) {
    this.timelineEvents.shift();
  }
};

IosPerfLog.prototype.getLogs = function () {
  this.flushed = true;
  return this.timelineEvents;
};

IosPerfLog.prototype.getAllLogs = function () {};

module.exports = function (opts) {
  return new IosPerfLog(opts);
};
