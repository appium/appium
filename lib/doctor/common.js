"use strict";
var prompt = require("prompt")
  , eol = require('os').EOL
  , socketio = require("socket.io");

require("colors");

prompt.message = '';
prompt.delimiter = '';

function Log(port) {
  this.port = port !== null ? parseInt(port) : null;
  this.broadcast = port !== null;
  this.socket = null;
  this.responseCallbacks = [];
}
exports.Log = Log;

Log.prototype.pass = function (msg, cb) {
  this.logEntry('\u2714 '.green + msg.white);
  if (cb) {
    cb(null, msg);
  }
};

Log.prototype.fail = function (msg, cb) {
  this.logEntry('\u2716 '.red +  msg.white);
  if (cb) {
    cb(msg, msg);
  }
};

Log.prototype.warning = function (msg) {
  this.logEntry(msg.yellow);
};

Log.prototype.error = function (msg) {
  this.logEntry(msg.red);
};

Log.prototype.comment = function (msg) {
  this.logEntry(msg.cyan);
};

Log.prototype.info = function (msg) {
  this.logEntry(msg.white);
};

Log.prototype.verbose = function (msg) {
  this.logEntry(msg.grey);
};

Log.prototype.debug = function (msg) {
  this.logEntry(msg.darkgrey);
};

Log.prototype.logEntry = function (msg) {
  console.log(msg);
  if (this.broadcast && this.socket !== null) {
    this.socket.emit('log', { message : msg});
  }
};

Log.prototype.startBroadcast = function (cb) {
  if (this.broadcast) {
    this.io = socketio.listen(this.port, { log: false });
    this.socket = null;
    this.io.sockets.on('connection', function (socket) {
      this.socket = socket;
      socket.emit('welcome', { message: 'Welcome' });
      socket.on('answer', function (data) {
        var responseCb = this.responseCallbacks[data.cbIndex];
        this.responseCallbacks[data.cbIndex] = null;
        responseCb(data.selection);
      }.bind(this));
      cb();
    }.bind(this));
  }
};

Log.prototype.stopBroadcast = function () {
  if (this.broadcast) {
    this.socket.emit('done');
    this.io.server.close();
  }
};

Log.prototype.exitDoctor = function () {
  this.stopBroadcast();
  this.error("Appium-Doctor detected problems. Please fix and rerun Appium-Doctor.");
  process.exit(-1);
};

Log.prototype.promptToFix = function (problemDescription, yesCb, noCb) {

  if (this.broadcast) {
    var cbIndex = this.responseCallbacks.push(function (selection) {
      if (selection === "Yes") {
        yesCb();
      } else {
        noCb();
      }
    }) - 1;
    this.socket.emit('alert', {
      title : "Appium Doctor",
      message : problemDescription + eol + eol + "Would you like Appium Doctor to attempt to fix it?",
      choices : [ "Yes", "No" ],
      cbIndex : cbIndex
    });
  } else {
    prompt.start();
    var promptSchema = {
      properties: {
        continue: {
          description: ("Fix it? (y/n) ").white,
          delimiter: '',
          type: 'string',
          pattern: /^(y|n)/,
          message: 'Please enter y or n!',
          required: true
        }
      }
    };
    prompt.get(promptSchema, function (err, result) {
      if (result.continue === 'y') {
        yesCb();
      } else {
        noCb();
      }
    });
  }
};

Log.prototype.promptToConfirmFix = function (cb) {
  if (this.broadcast) {
    var cbIndex = this.responseCallbacks.push(function () {
      cb();
    }) - 1;
    this.socket.emit('alert', {
      title : "Appium Doctor",
      message : "Press \"OK\" to check again.",
      choices : [ "OK" ],
      cbIndex : cbIndex
    });
  } else {
    prompt.start();
    var promptSchema = {
      properties: {
        continue: {
          description: 'Press any key to continue:'.white,
          type: 'string'
        }
      }
    };
    prompt.get(promptSchema, function () {
      cb();
    });
  }
};