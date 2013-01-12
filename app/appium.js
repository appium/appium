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
        , path.resolve(__dirname, '../instruments/bootstrap_example.js')
        , path.resolve(__dirname, 'uiauto/Automation.tracetemplate')
      );
    }

    var me = this;
    me.instruments.launch(function() {
      console.log('Instruments launched. Starting command poll loop for new commands.'.yellow);
      cb(null, me);
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
    
    if (cb) {
      cb();
    }
  });
};

Appium.prototype.proxy = function(command, cb) {
  // was thinking we should use a queue for commands instead of writing to a file
  session.queue.push(command);
  console.log('Pushed command to appium work queue.' + command);
};

module.exports = function(app, uuid, version) {
  return new Appium(app, uuid, version);
}; 
