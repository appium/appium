// Appium webserver controller methods
// https://github.com/hugs/appium/blob/master/appium/appium.py
"use strict";
var routing = require('./routing')
  , ios = require('./ios');

var Appium = function(args) {
  this.args = args;
  this.rest = null;
  this.devices = {};
  this.active = null;
  this.device = null;
  this.sessionId = null;
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
  if (this.sessionId === null) {
    this.sessionId = new Date().getTime();
    console.log('Creating new appium session ' + this.sessionId);

    // in future all the blackberries go here.
    this.active = 'iOS';
    if (typeof this.devices[this.active] === 'undefined') {
      this.devices[this.active] = ios(this.rest, this.args.app, this.args.UDID, this.args.verbose, this.args.remove);
    }
    this.device = this.devices[this.active];

    this.device.start(function(err, device) {
      cb(err, device);
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

  console.log('Shutting down appium session...');
  this.device.stop(function() {
    me.sessionId = null;
    if (cb) {
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
