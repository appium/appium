// Wrapper around Apple's Instruments app
//

var spawn = require('child_process').spawn,
    express = require('express');

var Instruments = function(server, app, udid, bootstrap, template) {
  this.server = server;
  this.app = app;
  this.udid = udid;
  this.bootstrap = bootstrap;
  this.template = template;
  this.curCommand = null;
  this.curCommandId = -1;
  this.commandCallbacks = [];
  this.resultHandler = this.defaultResultHandler;
  this.readyHandler = this.defaultReadyHandler;
  this.shutdownHandler = this.defaultShutdownHandler;
  this.proc = null;
  this.extendServer();
  this.shutdownTimeout = 5;
  this.debug = false;
};

Instruments.prototype.setDebug = function(debug) {
  if (typeof debug === "undefined") {
    this.debug = debug;
  }
};

Instruments.prototype.launch = function(cb, exitCb) {
  if (typeof cb !== "undefined") {
    this.readyHandler = cb;
  }
  var self = this;
  this.proc = this.spawnInstruments();
  this.proc.stdout.on('data', function(data) {
    self.outputStreamHandler(data);
  });
  this.proc.stderr.on('data', function(data) {
    self.errorStreamHandler(data);
  });

  var bye = function(code) {};
  if (typeof exitCb === "function") {
    bye = exitCb;
  }

  this.proc.on('exit', function(code) {
    console.log("Instruments exited with code " + code);
    bye(code);
  });
};

Instruments.prototype.shutdown = function(cb) {
  this.proc.kill();
  if (typeof cb === "function") {
    this.shutdownHandler = cb;
  }
  this.shutdownTimeoutObj = setTimeout(this.shutdownHandler, 1000 * this.shutdownTimeout);
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
  if (this.curCommand) {
    cb("Command in progress");
  } else {
    this.curCommandId++;
    this.curCommand = cmd;
    this.commandCallbacks[this.curCommandId] = cb;
  }
};

Instruments.prototype.extendServer = function(err, cb) {
  var self = this;

  this.server.get('/instruments/next_command', function(req, res) {
    console.log("instruments asking for command, it is " + self.curCommand);
    if (self.curCommand) {
      res.send(self.curCommandId+"|"+self.curCommand);
    } else {
      res.send(404, "Not Found");
    }
  });

  this.server.post('/instruments/send_result/:commandId', function(req, res) {
    var commandId = parseInt(req.params.commandId, 10);
    if (!req.body) {
      res.send(500, {error: "No result parameter found in POST body"});
    } else {
      var result = req.body.result;
      if (typeof commandId != "undefined" && typeof result != "undefined") {
        if (!self.curCommand) {
          res.send(500, {error: "Not waiting for a command result"});
        } else if (commandId != self.curCommandId) {
          res.send(500, {error: 'Command ID ' + commandId + ' does not match ' + self.curCommandId});
        } else {
          if (typeof result === "object" && typeof result.result !== "undefined") {
            result = result.result;
          }
          self.curCommand = null;
          self.commandCallbacks[commandId](result);
          res.send({success: true});
        }
      } else {
        res.send(500, {error: 'Bad parameters sent'});
      }
    }
  });

  this.server.post('/instruments/ready', function(req, res) {
    self.readyHandler();
    res.send({success: true});
  });
};

Instruments.prototype.setResultHandler = function(handler) {
  this.resultHandler = handler;
};

Instruments.prototype.defaultResultHandler = function(output) {
  // if we have multiple log lines, indent non-first ones
  if (output !== "") {
    output = output.replace(/\n/m, "\n       ");
    console.log("[INST] " + output);
  }
};

Instruments.prototype.defaultReadyHandler = function() {
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
    if(typeof this.shutdownTimeoutObj !== "undefined") {
      clearTimeout(this.shutdownTimeoutObj);
    }
    this.shutdownHandler(match[1]);
  }
};

Instruments.prototype.defaultShutdownHandler = function(traceDir) {
  console.log("Trace dir is " + traceDir);
};

Instruments.prototype.errorStreamHandler = function(output) {
  console.log("[INST STDERR] " + output);
};

module.exports = function(server, app, udid, bootstrap, template) {
  return new Instruments(server, app, udid, bootstrap, template);
};
