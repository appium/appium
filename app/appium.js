// Appium webserver controller methods
// https://github.com/hugs/appium/blob/master/appium/appium.py
var routing = require('./routing')
  , path = require('path')
  , instruments = require('../instruments/instruments');

var Appium = function(app, uuid, verbose) {
  this.app = app;
  this.uuid = uuid;
  this.verbose = verbose;
  this.instruments = null;
  this.rest = null;
  this.queue = [];
  this.progress = 0;
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
    console.log('The appium client start function has been called!');
    this.sessionId = new Date().getTime();

    if (this.instruments === null) {
      this.instruments = instruments(
        this.rest
        , path.resolve(__dirname, '../' + this.app)
        , null
        , path.resolve(__dirname, '../instruments/bootstrap.js')
        , path.resolve(__dirname, 'uiauto/Automation.tracetemplate')
      );
    }

    var me = this;
    me.instruments.launch(function() {
      console.log('Instruments launched. Starting command poll loop for new commands.'.yellow);
      cb(null, me);
    }, function(code) {
      if (!code || code > 0) {
        me.stop();
      }
    });
  } else {
    cb('Session already in progress', null);
  }
};

Appium.prototype.stop = function(cb) {
  console.log('The appium client stop function has been called!');
  var me = this;
  this.instruments.shutdown(function() {
    me.sessionId = null;
    me.queue = [];
    me.progress = 0;
    
    if (cb) {
      cb();
    }
  });
};

Appium.prototype.proxy = function(command, cb) {
  // was thinking we should use a queue for commands instead of writing to a file
  this.push([command, cb]);
  console.log('Pushed command to appium work queue.' + command);
};

Appium.prototype.push = function(elem) {
  this.queue.push(elem);
  var me = this;

  var next = function() {
    if (me.queue.length <= 0 || me.progess > 0) {
      return;
    }

    var target = me.queue.shift();
    me.progress++;

    me.instruments.sendCommand(target[0], function(result) {
      if (typeof target[1] === 'function') {
        var jsonresult = JSON.parse(result);
        target[1](jsonresult);
      }

      // maybe there's moar work to do
      me.progress--;
      next();
    });
  };

  next();
};

module.exports = function(app, uuid, version) {
  return new Appium(app, uuid, version);
}; 
