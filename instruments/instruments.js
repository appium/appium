// Wrapper around Apple's Instruments app
"use strict";

var spawn = require('child_process').spawn
  , exec = require('child_process').exec
  , logger = require('../logger').get('appium')
  , fs = require('fs')
  , _ = require('underscore')
  , net = require('net')
  , uuid = require('uuid-js')
  , path = require('path')
  , rimraf = require('rimraf')
  , mkdirp = require('mkdirp')
  , codes = require('../app/uiauto/lib/status.js').codes;

var Instruments = function(app, udid, isSafariLauncherApp, bootstrap, template, sock, withoutDelay, xcodeVersion, webSocket, cb, exitCb) {
  this.app = app;
  this.udid = udid;
  this.isSafariLauncherApp = isSafariLauncherApp;
  this.bootstrap = bootstrap;
  this.template = template;
  this.withoutDelay = withoutDelay;
  this.xcodeVersion = xcodeVersion;
  this.webSocket = webSocket;
  this.commandQueue = [];
  this.curCommand = null;
  this.resultHandler = this.defaultResultHandler;
  this.readyHandler = this.defaultReadyHandler;
  this.exitHandler = this.defaultExitHandler;
  this.hasConnected = false;
  this.traceDir = null;
  this.proc = null;
  this.debugMode = false;
  this.onReceiveCommand = null;
  this.guid = uuid.create();
  this.bufferedData = "";
  this.instrumentsPath = "";
  this.eventRouter = {
    'cmd': this.commandHandler
  };
  this.socketServer = null;
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

  var onSocketNeverConnect = function() {
    logger.error("Instruments socket client never checked in; timing out".red);
    if (this.proc !== null) {
      this.proc.kill('SIGTERM');
    }
    this.exitHandler(1);
  };

  // for safari launcher app we simply let the socket timeout and catch it.
  var socketConnectTimeout = null;
  if (this.isSafariLauncherApp) {
    socketConnectTimeout = setTimeout(onSocketNeverConnect.bind(this), 8000);
  } else {
    socketConnectTimeout = setTimeout(onSocketNeverConnect.bind(this), 90000);
  }

  this.socketServer = net.createServer({allowHalfOpen: true}, function(conn) {
    if (!this.hasConnected) {
      this.hasConnected = true;
      this.debug("Instruments is ready to receive commands");
      clearTimeout(socketConnectTimeout);
      this.readyHandler(this);
      this.readyHandler = this.defaultReadyHandler;
    }
    conn.setEncoding('utf8'); // get strings from sockets rather than buffers

    conn.on('data', function(data) {
      // when data comes in, route it according to the "event" property
      this.debug("Socket data received (" + data.length + " bytes)");
      this.bufferedData += data;
    }.bind(this));

    this.currentSocket = conn;
    //this.debug("Socket Connected");

    conn.on('close', function() {
        //this.debug("Socket Completely closed");
        this.currentSocket = null;
    }.bind(this));

    conn.on('end', function() {
      //this.debug("Socket closed by other side");
      var data = this.bufferedData;
      this.bufferedData = "";
      try {
        data = JSON.parse(data);
      } catch (e) {
        logger.error("Couldn't parse JSON data from socket, maybe buffer issue?");
        logger.error(data);
        data = {
          event: 'cmd'
          , result: {
            status: codes.UnknownError
            , value: "Error parsing socket data from instruments"
          }
        };
      }
      if (!_.has(data, 'event')) {
        logger.error("Socket data came in without event, it was:");
        logger.error(JSON.stringify(data));
      } else if (!_.has(this.eventRouter, data.event)) {
        logger.error("Socket is asking for event '" + data.event +
                    "' which doesn't exist");
      } else {
        this.debug("Socket data being routed for '" + data.event + "' event");
        this.eventRouter[data.event].bind(this)(data, conn);
      }
    }.bind(this));

  }.bind(this));

  this.socketServer.on('close', function() {
    this.debug("Instruments socket server closed");
  }.bind(this));

  exec('xcrun -find instruments', function (error, stdout) {
    this.instrumentsPath = stdout.trim();
    logger.info("instruments is: " + this.instrumentsPath);

    this.socketServer.listen(sock, function() {
      this.debug("Instruments socket server started at " + sock);
      this.launch();
    }.bind(this));
  }.bind(this));
};

Instruments.prototype.launch = function() {
  var self = this;
  // prepare temp dir
  var tmpDir = "/tmp/appium-instruments/";
  rimraf.sync(tmpDir);
  mkdirp.sync(tmpDir);

  fs.mkdir(tmpDir, function(e) {
    if (!e || (e && e.code === 'EEXIST')) {
      self.proc = self.spawnInstruments(tmpDir);
      self.proc.stdout.on('data', function(data) {
        self.outputStreamHandler(data);
      });
      self.proc.stderr.on('data', function(data) {
        self.errorStreamHandler(data);
      });

      self.proc.on('exit', function(code) {
        self.debug("Instruments exited with code " + code);
        if (self.isSafariLauncherApp){
          self.readyHandler();
        }
        if (self.curCommand && self.curCommand.cb) {
          self.curCommand.cb({
            status: code,
            value: "Instruments exited with code " + code
          });
        }
        self.exitCode = code;
        self.exitHandler(self.exitCode, self.traceDir);
        self.proc.stdin.end();
        self.proc = null;
        self.exitHandler = self.defaultExitHandler;
        self.resultHandler = self.defaultResultHandler;
        self.onReceiveCommand = null;
        if (self.currentSocket) {
          self.debug("Socket closed forcibly due to exit");
          self.currentSocket.end();
          self.currentSocket.destroy(); // close this
          self.socketServer.close();
        }
      });
    } else {
      throw e;
    }
  });
};

Instruments.prototype.spawnInstruments = function(tmpDir) {
  var args = ["-t", this.template];
  if (this.udid) {
    args = args.concat(["-w", this.udid]);
    logger.info("Attempting to run app on real device with UDID " + this.udid);
  }
  args = args.concat([this.app]);
  args = args.concat(["-e", "UIASCRIPT", this.bootstrap]);
  args = args.concat(["-e", "UIARESULTSPATH", tmpDir]);
  var env = _.clone(process.env);
  env.CA_DEBUG_TRANSACTIONS = 1;
  if (this.withoutDelay && !this.udid) {
    var isXcode4 = this.xcodeVersion !== null && this.xcodeVersion[0] === '4';
    env.DYLD_INSERT_LIBRARIES = path.resolve(__dirname, isXcode4 ?
      "../build/iwd4/InstrumentsShim.dylib" :
      "../build/iwd/InstrumentsShim.dylib");

    env.LIB_PATH = path.resolve(__dirname, isXcode4 ?
      "../build/iwd4" :
      "../build/iwd");
  }
  logger.info("Spawning instruments with command: " + this.instrumentsPath +
              " " + args.join(" "));
  logger.info("And extra without-delay env: " + JSON.stringify({
    DYLD_INSERT_LIBRARIES: env.DYLD_INSERT_LIBRARIES
    , LIB_PATH: env.LIB_PATH
  }));
  return spawn(this.instrumentsPath, args, {env: env});
};


/* COMMAND LIFECYCLE */

Instruments.prototype.commandHandler = function(data, c) {
  var hasResult = typeof data.result !== "undefined";
  if (hasResult && !this.curCommand) {
    logger.info("Got a result when we weren't expecting one! Ignoring it");
    logger.info("Result was: " + JSON.stringify(data.result));
  } else if (!hasResult && this.curCommand) {
    logger.info("Instruments didn't send a result even though we were expecting one");
    hasResult = true;
    data.result = false;
  }

  if (hasResult && this.curCommand) {
    if (data.result) {
      this.debug("Got result from instruments: " + JSON.stringify(data.result));
    } else {
      this.debug("Got null result from instruments");
    }
    this.curCommand.cb(data.result);
    this.curCommand = null;
  }

  this.waitForCommand(function() {
    this.curCommand = this.commandQueue.shift();
    this.onReceiveCommand = null;
    this.debug("Sending command to instruments: " + this.curCommand.cmd);
    c.write(JSON.stringify({nextCommand: this.curCommand.cmd}));
    c.end();
    //this.debug("Closing our half of the connection");
  }.bind(this));
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
};

Instruments.prototype.doExit = function() {
  console.log("Calling exit handler");
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
  logger.info(("[INST STDERR] " + output).yellow);
  if (this.webSocket) {
    var re = /Call to onAlert returned 'YES'/;
    var match = re.test(output);
    if (match) {
      logger.info("Emiting alert message...");
      this.webSocket.sockets.emit('alert', {message: output});
    }
  }
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
    logger.info(("[INST] " + output).green);
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

module.exports = function(server, app, isSafariLauncherApp, udid, bootstrap, template, sock, withoutDelay, webSocket, cb, exitCb) {
  return new Instruments(server, app, isSafariLauncherApp, udid, bootstrap, template, sock, withoutDelay, webSocket, cb, exitCb);
};

