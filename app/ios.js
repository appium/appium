var path = require('path')
  , rimraf = require('rimraf')
  , instruments = require('../instruments/instruments');

var IOS = function(rest, app, udid, verbose, removeTraceDir) {
  this.rest = rest;
  this.app = app;
  this.udid = udid;
  this.verbose = verbose;
  this.instruments = null;
  this.queue = [];
  this.progress = 0;
  this.removeTraceDir = removeTraceDir;
};

IOS.prototype.start = function(cb) {
  if (this.instruments === null) {
    this.instruments = instruments(
      this.rest
      , path.resolve(__dirname, '../' + this.app)
      , this.udid
      , path.resolve(__dirname, 'uiauto/bootstrap.js')
      , path.resolve(__dirname, 'uiauto/Automation.tracetemplate')
    );
  }

  var me = this;
  me.instruments.launch(function() {
    console.log('Instruments launched. Starting poll loop for new commands.');
    me.instruments.setDebug(true);
    cb(null, me);
  }, function(code) {
    if (!code || code > 0) {
      me.stop();
    }
  });
};

IOS.prototype.stop = function(cb) {
  var me = this;

  this.instruments.shutdown(function(traceDir) {
    me.queue = [];
    me.progress = 0;
    rimraf(traceDir, function() {
      if (cb) {
        cb();
      }
    });
  });
};

IOS.prototype.proxy = function(command, cb) {
  // was thinking we should use a queue for commands instead of writing to a file
  this.push([command, cb]);
  console.log('Pushed command to appium work queue: ' + command);
};

IOS.prototype.push = function(elem) {
  this.queue.push(elem);
  var me = this;

  var next = function() {
    if (me.queue.length <= 0 || me.progress > 0) {
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

module.exports = function(rest, app, udid, verbose, removeTraceDir) {
  return new IOS(rest, app, udid, verbose, removeTraceDir);
};
