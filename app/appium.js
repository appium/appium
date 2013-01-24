// Appium webserver controller methods
// https://github.com/hugs/appium/blob/master/appium/appium.py
"use strict";
var routing = require('./routing')
  , logger = require('../logger').get('appium')
  , UUID = require('uuid-js')
  , _ = require('underscore')
  , ios = require('./ios');

var Appium = function(args) {
  this.args = args;
  if (!this.args.verbose) {
    logger.transports.console.level = 'warn';
  }
  this.rest = null;
  this.devices = {};
  this.active = null;
  this.device = null;
  this.sessionId = null;
  this.desiredCapabilities = {};
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

Appium.prototype.start = function(desiredCaps, cb) {
  this.desiredCapabilities = desiredCaps;
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
      this.devices[this.active] = ios(this.rest, this.args.app, this.args.udid, this.args.verbose, this.args.remove);
    }
    this.device = this.devices[this.active];

    this.device.start(function(err) {
      me.progress++;
      me.sessions[me.progress].sessionId = me.sessionId;
      me.sessions[me.progress].callback(err, me.device);
    }, _.bind(me.onDeviceDie, me));
  }
};

Appium.prototype.onDeviceDie = function(code, cb) {
  var dyingSession = this.sessionId;
  this.sessionId = null;
  if (code !== null) {
    this.devices = {};
    this.device = null;
  }
  if (cb) {
    if (this.active !== null) {
      this.active = null;
      this.invoke();
    }
    cb(null, {status: 0, value: null, sessionId: dyingSession});
  }
};

Appium.prototype.stop = function(cb) {
  if (this.sessionId === null) {
    return;
  }

  var me = this;

  logger.info('Shutting down appium session...');
  this.device.stop(function(code) {
    me.onDeviceDie(code, cb);
  });
};

module.exports = function(args) {
  return new Appium(args);
};
