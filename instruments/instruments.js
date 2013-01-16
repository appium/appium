// Wrapper around Apple's Instruments app
"use strict";

var spawn = require('child_process').spawn
  , colors = require('colors')
  , logger = require('../logger').get('instruments')
  , fs = require('fs')
  , _ = require('underscore')
  , net = require('net');

var Instruments = function(app, udid, bootstrap, template, sock, cb, exitCb) {
  this.app = app;
  this.udid = udid;
  this.bootstrap = bootstrap;
  this.template = template;
  this.commandQueue = [];
  this.curCommand = null;
  this.resultHandler = this.defaultResultHandler;
  this.readyHandler = this.defaultReadyHandler;
  this.exitHandler = this.defaultExitHandler;
  this.hasExited = false;
  this.hasConnected = false;
  this.hasShutdown = false;
  this.traceDir = null;
  this.proc = null;
  this.debugMode = false;
  this.onReceiveCommand = null;
  this.eventRouter = {
    'cmd': this.commandHandler
  };
  if (typeof sock === "undefined") {
    sock = '/tmp/instruments_sock';
  }
  if (typeof cb !== "undefined") {
    this.readyHandler = cb;
  }
  if (typeof exitCb !== "undefined") {
    this.exitHandler = exitCb;
  }

  this.startSocketServer(sock);

};


/* INITIALIZATION */

Instruments.prototype.startSocketServer = function(sock) {
  // remove socket if it currently exists
  try {
    fs.unlinkSync(sock);
  } catch (Exception) {}

  var server = net.createServer(_.bind(function(conn) {
    if (!this.hasConnected) {
      this.hasConnected = true;
      this.debug("Instruments is ready to receive commands");
      this.readyHandler(this);
    }
    conn.setEncoding('utf8'); // get strings from sockets rather than buffers

    conn.on('data', _.bind(function(data) {
      // when data comes in, route it according to the "event" property
      data = JSON.parse(data);
      if (!_.has(data, 'event')) {
        logger.error("Socket data came in witout event, it was:");
        logger.error(JSON.stringify(data));
      } else if (!_.has(this.eventRouter, data.event)) {
        logger.error("Socket is asking for event '" + data.event +
                    "' which doesn't exist");
      } else {
        this.debug("Socket data being routed for '" + data.event + "' event");
        _.bind(this.eventRouter[data.event], this)(data, conn);
      }
    }, this));

  }, this));

  server.listen(sock, _.bind(function() {
    this.debug("Instruments socket server started at " + sock);
    this.launch();
  }, this));
};

Instruments.prototype.launch = function() {
  var self = this;
  this.proc = this.spawnInstruments();
  this.proc.stdout.on('data', function(data) {
    self.outputStreamHandler(data);
  });
  this.proc.stderr.on('data', function(data) {
    self.errorStreamHandler(data);
  });

  this.proc.on('exit', function(code) {
    self.debug("Instruments exited with code " + code);
    self.exitCode = code;
    self.hasExited = true;
    self.doExit();
  });
};

Instruments.prototype.spawnInstruments = function() {
  var args = ["-t", this.template];
  if (this.udid) {
    args = args.concat(["-w", this.udid]);
  }
  args = args.concat([this.app]);
  args = args.concat(["-e", "UIASCRIPT", this.bootstrap]);
  args = args.concat(["-e", "UIARESULTSPATH", '/tmp']);
  return spawn("/usr/bin/instruments", args);
};


/* COMMAND LIFECYCLE */

Instruments.prototype.commandHandler = function(data, c) {
  var hasResult = typeof data.result !== "undefined";
  if (hasResult && !this.curCommand) {
    logger.info("Got a result when we weren't expecting one! Ignoring it");
  } else if (!hasResult && this.curCommand) {
    logger.info("Instruments didn't send a result even though we were expecting one");
    hasResult = true;
    data.result = false;
  }

  if (hasResult) {
    if (data.result) {
      this.debug("Got result from instruments: " + data.result);
    } else {
      this.debug("Got null result from instruments");
    }
    this.curCommand.cb(data.result);
    this.curCommand = null;
  }

  this.waitForCommand(_.bind(function() {
    this.curCommand = this.commandQueue.shift();
    this.onReceiveCommand = null;
    this.debug("Sending command to instruments: " + this.curCommand.cmd);
    c.write(JSON.stringify({nextCommand: this.curCommand.cmd}));
  }, this));
};

Instruments.prototype.waitForCommand = function(cb) {
  if (this.commandQueue.length) {
    cb();
  } else {
    this.onReceiveCommand = cb;
  }
};

Instruments.prototype.sendCommand = function(cmd, cb) {
  this.commandQueue.push({cmd: cmd, cb: cb});
  if (this.onReceiveCommand) {
    this.onReceiveCommand();
  }
};


/* PROCESS MANAGEMENT */

Instruments.prototype.shutdown = function() {
  this.proc.kill();
  this.hasShutdown = true;
  this.doExit();
};

Instruments.prototype.doExit = function() {
  if (this.hasShutdown && this.hasExited) {
    this.exitHandler(this.exitCode, this.traceDir);
  }
};


/* INSTRUMENTS STREAM MANIPULATION*/

Instruments.prototype.clearBufferChars = function(output) {
  // Instruments output is buffered, so for each log output we also output
  // a stream of very many ****. This function strips those out so all we
  // get is the log output we care about
  var re = /(\n|^)\*+\n?/g;
  output = output.toString();
  output = output.replace(re, "");
  return output;
};

Instruments.prototype.outputStreamHandler = function(output) {
  output = this.clearBufferChars(output);
  this.lookForShutdownInfo(output);
  this.resultHandler(output);
};

Instruments.prototype.errorStreamHandler = function(output) {
  logger.error(("[INST STDERR] " + output).yellow);
};

Instruments.prototype.lookForShutdownInfo = function(output) {
  var re = /Instruments Trace Complete.+Output : ([^\)]+)\)/;
  var match = re.exec(output);
  if (match) {
    this.traceDir = match[1];
  }
};


/* DEFAULT HANDLERS */

Instruments.prototype.setResultHandler = function(handler) {
  this.resultHandler = handler;
};

Instruments.prototype.defaultResultHandler = function(output) {
  // if we have multiple log lines, indent non-first ones
  if (output !== "") {
    output = output.replace(/\n/m, "\n       ");
    logger.info(("[INST] " + output).blue);
  }
};

Instruments.prototype.defaultReadyHandler = function() {
  logger.info("Instruments is ready and waiting!");
};

Instruments.prototype.defaultExitHandler = function(code, traceDir) {
  logger.info("Instruments exited with code " + code + " and trace dir " + traceDir);
};


/* MISC */

Instruments.prototype.setDebug = function(debug) {
  if (typeof debug === "undefined") {
    debug = true;
  }
  this.debugMode = debug;
};

Instruments.prototype.debug = function(msg) {
  logger.info(("[INSTSERVER] " + msg).grey);
};


/* NODE EXPORTS */

module.exports = function(server, app, udid, bootstrap, template, sock, cb, exitCb) {
  return new Instruments(server, app, udid, bootstrap, template, sock, cb, exitCb);
};

