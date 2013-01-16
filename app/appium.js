// Appium webserver controller methods
// https://github.com/hugs/appium/blob/master/appium/appium.py
"use strict";
var routing = require('./routing')
  , logger = require('../logger').get('appium')
  , UUID = require('uuid-js')
  , ios = require('./ios');

var Appium = function(args) {
  this.args = args;
  this.rest = null;
  this.devices = {};
  this.active = null;
  this.device = null;
  this.sessionId = null;
  this.sessions = [];
  this.counter = -1;
  this.progress = -1;
};

Appium.prototype.attachTo = function(rest, cb) {
  this.rest = rest;

  // Import the routing rules
  routing(this);

  if (cb) {
    cb();
  }
};

Appium.prototype.start = function(cb) {
  this.sessions[++this.counter] = { sessionId: '', callback: cb };
  this.invoke();
};

Appium.prototype.invoke = function() {
  var me = this;

  if (this.progress >= this.counter) {
    return;
  }

  if (this.sessionId === null) {
    this.sessionId = UUID.create().hex;
    logger.info('Creating new appium session ' + this.sessionId);

    // in future all the blackberries go here.
    this.active = 'iOS';
    if (typeof this.devices[this.active] === 'undefined') {
      this.devices[this.active] = ios(this.rest, this.args.app, this.args.UDID, this.args.verbose, this.args.remove);
    }
    this.device = this.devices[this.active];

    this.device.start(function(err, device) {
      me.progress++;
      me.sessions[me.progress].sessionId = me.sessionId;
      me.sessions[me.progress].callback(err, device);
    });
  }
};

Appium.prototype.proxy = function(cmd, cb) {
  this.device.proxy(cmd, cb);
};

Appium.prototype.stop = function(cb) {
  if (this.sessionId === null) {
    return;
  }

  var me = this;

  logger.info('Shutting down appium session...');
  this.device.stop(function() {
    me.sessionId = null;
    me.devices = {};
    if (cb) {
      if (me.active !== null) {
        me.active = null;
        me.invoke();
      }
      cb(me.sessionId);
    }
  });
};

Appium.prototype.device = function() {
  return this.devices[this.active];
};

module.exports = function(args) {
  return new Appium(args);
};
