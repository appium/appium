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
    this.sessionId = new Date().getTime();
    console.log('Creating new appium session ' + this.sessionId);

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
      console.log('Instruments launched. Starting poll loop for new commands.');
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
  if (this.sessionId === null) {
    return;
  }
  var me = this;

  this.instruments.shutdown(function() {
    console.log('Shutting down appium session ' + me.sessionId);
    me.queue = [];
    me.progress = 0;
    me.sessionId = null;
    
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
        if (result === 'undefined') {
          target[1]();
        } else {
          try {
            var jsonresult = JSON.parse(result);
            target[1](jsonresult);
          } catch (e) {
            target[1](result);
          }
        }
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
