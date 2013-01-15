// Wrapper around Apple's Instruments app
//

var spawn = require('child_process').spawn
  , colors = require('colors')
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
  this.shutdownHandler = _.bind(function() {
    this.hasShutdown = true;
    this.doExit();
  }, this);
  this.traceDir = null;
  this.hasConnected = false;
  this.hasShutdown = false;
  this.proc = null;
  this.debugMode = false;
  this.sock = sock;
  this.onReceiveCommand = null;
  this.eventRouter = {
    'cmd': this.commandHandler
  };
  if (!sock) {
    this.sock = '/tmp/instruments_sock';
  }
  try {
    fs.unlinkSync(this.sock);
  } catch (Exception) {}
  if (typeof cb !== "undefined") {
    this.readyHandler = cb;
  }
  if (typeof exitCb !== "undefined") {
    this.exitHandler = exitCb;
  }

  var self = this;
  this.server = net.createServer(function(c) {
    if (!self.hasConnected) {
      self.hasConnected = true;
      self.debug("Instruments is ready to receive commands");
      self.readyHandler(self);
    }
    c.setEncoding('utf8');
    c.on('data', function(data) {
      data = JSON.parse(data);
      _.bind(self.eventRouter[data.event], self)(data, c);
    });
  });
  this.server.listen(this.sock, function() {
    self.debug("Instruments socket server started at " + self.sock);
    self.launch();
  });
};

Instruments.prototype.commandHandler = function(data, c) {
  var hasResult = typeof data.result !== "undefined";
  if (hasResult && !this.curCommand) {
    console.log("Got a result when we weren't expecting one! Ignoring it");
  } else if (!hasResult && this.curCommand) {
    console.log("Instruments didn't send a result even though we were expecting one");
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

Instruments.prototype.setDebug = function(debug) {
  if (typeof debug === "undefined") {
    debug = true;
  }
  this.debugMode = debug;
};

Instruments.prototype.debug = function(msg) {
  console.log(("[INSTSERVER] " + msg).grey);
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

Instruments.prototype.shutdown = function() {
  this.proc.kill();
  this.shutdownTimeoutObj = setTimeout(this.shutdownHandler, 3000 * this.shutdownTimeout);
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

Instruments.prototype.sendCommand = function(cmd, cb) {
  this.commandQueue.push({cmd: cmd, cb: cb});
  if (this.onReceiveCommand) {
    this.onReceiveCommand();
  }
};

Instruments.prototype.setResultHandler = function(handler) {
  this.resultHandler = handler;
};

Instruments.prototype.defaultResultHandler = function(output) {
  // if we have multiple log lines, indent non-first ones
  if (output !== "") {
    output = output.replace(/\n/m, "\n       ");
    console.log(("[INST] " + output).blue);
  }
};

Instruments.prototype.defaultReadyHandler = function(inst) {
  console.log("Instruments is ready and waiting!");
};

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

Instruments.prototype.lookForShutdownInfo = function(output) {
  var re = /Instruments Trace Complete.+Output : ([^\)]+)\)/;
  var match = re.exec(output);
  if (match) {
    this.traceDir = match[1];
  }
};

Instruments.prototype.doExit = function() {
  if (this.hasShutdown && this.hasExited) {
    this.exitHandler(this.exitCode, this.traceDir);
  }
};

Instruments.prototype.defaultExitHandler = function(code, traceDir) {
  console.log("Instruments exited with code " + code + " and trace dir " + traceDir);
};

Instruments.prototype.errorStreamHandler = function(output) {
  console.log(("[INST STDERR] " + output).yellow);
};

module.exports = function(server, app, udid, bootstrap, template, sock, cb, exitCb) {
  return new Instruments(server, app, udid, bootstrap, template, sock, cb, exitCb);
};
